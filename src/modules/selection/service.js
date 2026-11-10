// src/modules/selection/service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

const DEFAULT_FIELDS_JSON = [
  { key: "description", label: "Description", type: "textarea" },
  { key: "image", label: "Image", type: "image" },
  { key: "remarks", label: "Remarks / Note", type: "textarea" },
  { key: "checkbox", label: "Checkbox", type: "checkbox" },
];

const FORM_COLUMNS = `
  ID, P_ID, TITLE, LEVEL_NO, IS_TEMPLATE, STATUS, COPIED_FROM_ID,
  TO_CHAR(PUBLISHED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS PUBLISHED_DATE,
  PUBLISHED_BY,
  TO_CHAR(CONFIRMED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CONFIRMED_DATE,
  CONFIRMED_BY,
  CREATED_BY, TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE,
  UPDATED_BY, TO_CHAR(UPDATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_DATE
`;

// ─────────────────────────────────────────────
// FORMS
// ─────────────────────────────────────────────
export async function listForms({ projectId, templates, ownerId } = {}) {
  const connection = await getConnection();
  try {
    const conditions = [];
    const binds = {};

    if (projectId) {
      conditions.push("P_ID = :p_id");
      binds.p_id = Number(projectId);
    }
    if (templates) {
      conditions.push("IS_TEMPLATE = 'Y'");
    }
    if (ownerId !== null && ownerId !== undefined) {
      conditions.push("IS_TEMPLATE = 'N'");
      conditions.push("STATUS IN ('PUBLISHED', 'CONFIRMED')");
      conditions.push(`EXISTS (
        SELECT 1 FROM PM.PM_OWNER_INFO oi
        WHERE oi.ID = :owner_id AND oi.PROJECT_ID = PM_SELECTION_FORM.P_ID
      )`);
      binds.owner_id = Number(ownerId);
    }

    let sql = `SELECT ${FORM_COLUMNS} FROM PM.PM_SELECTION_FORM`;
    if (conditions.length) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY UPDATED_DATE DESC NULLS LAST, ID DESC";

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function createForm(data, userId) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `INSERT INTO PM.PM_SELECTION_FORM
       (P_ID, TITLE, LEVEL_NO, IS_TEMPLATE, STATUS, CREATED_BY, UPDATED_BY)
       VALUES
       (:p_id, :title, :level_no, :is_template, 'DRAFT', :created_by, :updated_by)
       RETURNING ID INTO :new_id`,
      {
        p_id: data.P_ID ?? null,
        title: data.TITLE,
        level_no: data.LEVEL_NO ?? null,
        is_template: data.IS_TEMPLATE ?? "N",
        created_by: Number(userId ?? 0),
        updated_by: Number(userId ?? 0),
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false },
    );

    const id = result.outBinds.new_id[0];
    const form = await _fetchForm(connection, id);
    await connection.commit();
    return form;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function getFormById(formId, ownerId = null) {
  const connection = await getConnection();
  try {
    return await _fetchForm(connection, formId, ownerId);
  } finally {
    await connection.close();
  }
}

export async function updateForm(formId, data, userId) {
  const connection = await getConnection();
  try {
    const lockedForm = await _requireDraftForm(connection, formId);
    if (!lockedForm) {
      await connection.rollback();
      return null;
    }

    const set = [];
    const binds = {
      id: Number(formId),
      updated_by: Number(userId ?? 0),
    };

    if (Object.prototype.hasOwnProperty.call(data, "TITLE")) {
      set.push("TITLE = :title");
      binds.title = data.TITLE;
    }
    if (Object.prototype.hasOwnProperty.call(data, "LEVEL_NO")) {
      set.push("LEVEL_NO = :level_no");
      binds.level_no = data.LEVEL_NO ?? null;
    }

    if (!set.length) return null;

    set.push("UPDATED_BY = :updated_by");
    set.push("UPDATED_DATE = SYSDATE");

    const result = await connection.execute(
      `UPDATE PM.PM_SELECTION_FORM
          SET ${set.join(", ")}
        WHERE ID = :id`,
      binds,
      { autoCommit: false },
    );

    if (!result.rowsAffected) {
      await connection.rollback();
      return null;
    }

    const form = await _fetchForm(connection, formId);
    await connection.commit();
    return form;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function deleteForm(formId) {
  const connection = await getConnection();
  try {
    const lockedForm = await _requireDraftForm(connection, formId);
    if (!lockedForm) {
      await connection.rollback();
      return false;
    }

    const result = await connection.execute(
      `DELETE FROM PM.PM_SELECTION_FORM WHERE ID = :id`,
      { id: Number(formId) },
      { autoCommit: false },
    );

    if (!result.rowsAffected) {
      await connection.rollback();
      return false;
    }

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// AREAS
// ─────────────────────────────────────────────
export async function createArea(formId, data, userId) {
  const connection = await getConnection();
  try {
    const form = await _requireDraftForm(connection, formId);
    if (!form) {
      await connection.rollback();
      return null;
    }

    let parentId = null;
    if (data.PARENT_ID !== undefined && data.PARENT_ID !== null) {
      parentId = Number(data.PARENT_ID);
      const parentResult = await connection.execute(
        `SELECT ID FROM PM.PM_SELECTION_AREA
          WHERE ID = :id AND FORM_ID = :form_id`,
        { id: parentId, form_id: Number(formId) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      if (!parentResult.rows?.length) {
        throw _badRequest("PARENT_ID does not belong to this form.");
      }
    }

    const sortResult = await connection.execute(
      `SELECT NVL(MAX(SORT_ORDER), -1) + 1 AS NEXT_SORT
         FROM PM.PM_SELECTION_AREA
        WHERE FORM_ID = :form_id`,
      { form_id: Number(formId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const sortOrder = sortResult.rows?.[0]?.NEXT_SORT ?? 0;

    const fieldsJson = _jsonText(
      data.FIELDS_JSON === undefined ? DEFAULT_FIELDS_JSON : data.FIELDS_JSON,
    );

    const insertResult = await connection.execute(
      `INSERT INTO PM.PM_SELECTION_AREA
       (FORM_ID, PARENT_ID, NAME, FIELDS_JSON, SORT_ORDER)
       VALUES
       (:form_id, :parent_id, :name, EMPTY_CLOB(), :sort_order)
       RETURNING ID, FIELDS_JSON INTO :new_id, :fields_out`,
      {
        form_id: Number(formId),
        parent_id: parentId,
        name: data.NAME,
        sort_order: Number(sortOrder),
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        fields_out: { dir: oracledb.BIND_OUT, type: oracledb.CLOB },
      },
      { autoCommit: false },
    );

    await _writeStringToClob(insertResult.outBinds.fields_out[0], fieldsJson);

    const areaId = insertResult.outBinds.new_id[0];
    const area = await _fetchArea(connection, areaId);
    await _touchForm(connection, formId, userId);
    await connection.commit();
    return area;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function updateArea(areaId, data, userId) {
  const connection = await getConnection();
  try {
    const current = await connection.execute(
      `SELECT ID, FORM_ID FROM PM.PM_SELECTION_AREA WHERE ID = :id`,
      { id: Number(areaId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const areaRow = current.rows?.[0];
    if (!areaRow) {
      await connection.rollback();
      return null;
    }

    const lockedForm = await _requireDraftForm(connection, areaRow.FORM_ID);
    if (!lockedForm) {
      await connection.rollback();
      return null;
    }

    const set = [];
    const binds = { id: Number(areaId) };
    const hasFieldsJson = Object.prototype.hasOwnProperty.call(
      data,
      "FIELDS_JSON",
    );
    let fieldsJson = null;

    if (Object.prototype.hasOwnProperty.call(data, "NAME")) {
      set.push("NAME = :name");
      binds.name = data.NAME;
    }
    if (hasFieldsJson) {
      fieldsJson = _jsonText(data.FIELDS_JSON);
    }
    if (Object.prototype.hasOwnProperty.call(data, "SORT_ORDER")) {
      set.push("SORT_ORDER = :sort_order");
      binds.sort_order = Number(data.SORT_ORDER);
    }

    if (!set.length && !hasFieldsJson) return null;

    if (set.length) {
      await connection.execute(
        `UPDATE PM.PM_SELECTION_AREA
            SET ${set.join(", ")}
          WHERE ID = :id`,
        binds,
        { autoCommit: false },
      );
    }

    if (hasFieldsJson) {
      const clobResult = await connection.execute(
        `UPDATE PM.PM_SELECTION_AREA
            SET FIELDS_JSON = EMPTY_CLOB()
          WHERE ID = :id
          RETURNING FIELDS_JSON INTO :fields_out`,
        {
          id: Number(areaId),
          fields_out: { dir: oracledb.BIND_OUT, type: oracledb.CLOB },
        },
        { autoCommit: false },
      );
      await _writeStringToClob(clobResult.outBinds.fields_out[0], fieldsJson);
    }

    const area = await _fetchArea(connection, areaId);
    await _touchForm(connection, areaRow.FORM_ID, userId);
    await connection.commit();
    return area;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function deleteArea(areaId, userId) {
  const connection = await getConnection();
  try {
    const current = await connection.execute(
      `SELECT ID, FORM_ID FROM PM.PM_SELECTION_AREA WHERE ID = :id`,
      { id: Number(areaId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const areaRow = current.rows?.[0];
    if (!areaRow) {
      await connection.rollback();
      return false;
    }

    const lockedForm = await _requireDraftForm(connection, areaRow.FORM_ID);
    if (!lockedForm) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `DELETE FROM PM.PM_SELECTION_AREA WHERE ID = :id`,
      { id: Number(areaId) },
      { autoCommit: false },
    );

    await _touchForm(connection, areaRow.FORM_ID, userId);
    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// ITEMS
// ─────────────────────────────────────────────
export async function createItem(areaId, userId) {
  const connection = await getConnection();
  try {
    const areaResult = await connection.execute(
      `SELECT ID, FORM_ID FROM PM.PM_SELECTION_AREA WHERE ID = :id`,
      { id: Number(areaId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const areaRow = areaResult.rows?.[0];
    if (!areaRow) {
      await connection.rollback();
      return null;
    }

    const lockedForm = await _requireDraftForm(connection, areaRow.FORM_ID);
    if (!lockedForm) {
      await connection.rollback();
      return null;
    }

    const sortResult = await connection.execute(
      `SELECT NVL(MAX(SORT_ORDER), -1) + 1 AS NEXT_SORT
         FROM PM.PM_SELECTION_ITEM
        WHERE AREA_ID = :area_id`,
      { area_id: Number(areaId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const sortOrder = sortResult.rows?.[0]?.NEXT_SORT ?? 0;

    const insertResult = await connection.execute(
      `INSERT INTO PM.PM_SELECTION_ITEM
       (AREA_ID, SORT_ORDER)
       VALUES
       (:area_id, :sort_order)
       RETURNING ID INTO :new_id`,
      {
        area_id: Number(areaId),
        sort_order: Number(sortOrder),
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false },
    );

    const itemId = insertResult.outBinds.new_id[0];
    const item = await _fetchItem(connection, itemId);
    await _touchForm(connection, areaRow.FORM_ID, userId);
    await connection.commit();
    return item;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function updateItem(itemId, data, userId) {
  const connection = await getConnection();
  try {
    const current = await connection.execute(
      `SELECT i.ID, a.FORM_ID
         FROM PM.PM_SELECTION_ITEM i
         JOIN PM.PM_SELECTION_AREA a ON a.ID = i.AREA_ID
        WHERE i.ID = :id`,
      { id: Number(itemId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const itemRow = current.rows?.[0];
    if (!itemRow) {
      await connection.rollback();
      return null;
    }

    const lockedForm = await _requireDraftForm(connection, itemRow.FORM_ID);
    if (!lockedForm) {
      await connection.rollback();
      return null;
    }

    const set = [];
    const binds = { id: Number(itemId) };
    const hasValuesJson = Object.prototype.hasOwnProperty.call(
      data,
      "VALUES_JSON",
    );
    let valuesJson = null;

    if (hasValuesJson) {
      valuesJson = _jsonText(data.VALUES_JSON);
    }
    if (Object.prototype.hasOwnProperty.call(data, "SORT_ORDER")) {
      set.push("SORT_ORDER = :sort_order");
      binds.sort_order = Number(data.SORT_ORDER);
    }

    if (!set.length && !hasValuesJson) return null;

    if (set.length) {
      await connection.execute(
        `UPDATE PM.PM_SELECTION_ITEM
            SET ${set.join(", ")}
          WHERE ID = :id`,
        binds,
        { autoCommit: false },
      );
    }

    if (hasValuesJson) {
      const clobResult = await connection.execute(
        `UPDATE PM.PM_SELECTION_ITEM
            SET VALUES_JSON = EMPTY_CLOB()
          WHERE ID = :id
          RETURNING VALUES_JSON INTO :values_out`,
        {
          id: Number(itemId),
          values_out: { dir: oracledb.BIND_OUT, type: oracledb.CLOB },
        },
        { autoCommit: false },
      );
      await _writeStringToClob(clobResult.outBinds.values_out[0], valuesJson);
    }

    const item = await _fetchItem(connection, itemId);
    await _touchForm(connection, itemRow.FORM_ID, userId);
    await connection.commit();
    return item;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function deleteItem(itemId, userId) {
  const connection = await getConnection();
  try {
    const current = await connection.execute(
      `SELECT i.ID, a.FORM_ID
         FROM PM.PM_SELECTION_ITEM i
         JOIN PM.PM_SELECTION_AREA a ON a.ID = i.AREA_ID
        WHERE i.ID = :id`,
      { id: Number(itemId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const itemRow = current.rows?.[0];
    if (!itemRow) {
      await connection.rollback();
      return false;
    }

    const lockedForm = await _requireDraftForm(connection, itemRow.FORM_ID);
    if (!lockedForm) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `DELETE FROM PM.PM_SELECTION_ITEM WHERE ID = :id`,
      { id: Number(itemId) },
      { autoCommit: false },
    );

    await _touchForm(connection, itemRow.FORM_ID, userId);
    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// FILES
// ─────────────────────────────────────────────
export async function addFile(itemId, file, fieldKey, userId) {
  const connection = await getConnection();
  try {
    const itemResult = await connection.execute(
      `SELECT i.ID, a.FORM_ID
         FROM PM.PM_SELECTION_ITEM i
         JOIN PM.PM_SELECTION_AREA a ON a.ID = i.AREA_ID
        WHERE i.ID = :id`,
      { id: Number(itemId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const itemRow = itemResult.rows?.[0];
    if (!itemRow) {
      await connection.rollback();
      return null;
    }

    const lockedForm = await _requireDraftForm(connection, itemRow.FORM_ID);
    if (!lockedForm) {
      await connection.rollback();
      return null;
    }

    const insertResult = await connection.execute(
      `INSERT INTO PM.PM_SELECTION_FILE
       (ITEM_ID, FIELD_KEY, FILE_NAME, MIME_TYPE, FILE_SIZE,
        DOC_FILE, CREATED_BY)
       VALUES
       (:item_id, :field_key, :file_name, :mime_type, :file_size,
        EMPTY_BLOB(), :created_by)
       RETURNING ID, DOC_FILE INTO :new_id, :blob_out`,
      {
        item_id: Number(itemId),
        field_key: fieldKey ?? null,
        file_name: file.originalname ?? null,
        mime_type: file.mimetype ?? null,
        file_size: Number(file.size ?? 0),
        created_by: Number(userId ?? 0),
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        blob_out: { dir: oracledb.BIND_OUT, type: oracledb.BLOB },
      },
      { autoCommit: false },
    );

    const fileId = insertResult.outBinds.new_id[0];
    const blobLob = insertResult.outBinds.blob_out[0];
    await _writeBufferToBlob(blobLob, file.buffer);

    const savedFile = await _fetchFile(connection, fileId);
    await _touchForm(connection, itemRow.FORM_ID, userId);
    await connection.commit();
    return savedFile;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function getFileBlob(fileId, ownerId = null) {
  const connection = await getConnection();
  try {
    let sql = `
      SELECT f.ID, f.ITEM_ID, f.FIELD_KEY, f.FILE_NAME, f.MIME_TYPE,
             f.FILE_SIZE, f.DOC_FILE
        FROM PM.PM_SELECTION_FILE f
        JOIN PM.PM_SELECTION_ITEM i ON i.ID = f.ITEM_ID
        JOIN PM.PM_SELECTION_AREA a ON a.ID = i.AREA_ID
        JOIN PM.PM_SELECTION_FORM fm ON fm.ID = a.FORM_ID
       WHERE f.ID = :id`;
    const binds = { id: Number(fileId) };

    if (ownerId !== null && ownerId !== undefined) {
      sql += `
         AND fm.IS_TEMPLATE = 'N'
         AND fm.STATUS IN ('PUBLISHED', 'CONFIRMED')
         AND EXISTS (
           SELECT 1 FROM PM.PM_OWNER_INFO oi
           WHERE oi.ID = :owner_id AND oi.PROJECT_ID = fm.P_ID
         )`;
      binds.owner_id = Number(ownerId);
    }

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    if (!result.rows?.length) return null;
    const row = result.rows[0];

    let buffer = row.DOC_FILE ?? null;
    if (buffer && typeof buffer.on === "function") {
      buffer = await _blobToBuffer(buffer);
    }

    return {
      id: row.ID,
      itemId: row.ITEM_ID,
      fieldKey: row.FIELD_KEY,
      fileName: row.FILE_NAME,
      mimeType: row.MIME_TYPE,
      fileSize: row.FILE_SIZE,
      buffer,
    };
  } finally {
    await connection.close();
  }
}

export async function deleteFile(fileId, userId) {
  const connection = await getConnection();
  try {
    const current = await connection.execute(
      `SELECT f.ID, a.FORM_ID
         FROM PM.PM_SELECTION_FILE f
         JOIN PM.PM_SELECTION_ITEM i ON i.ID = f.ITEM_ID
         JOIN PM.PM_SELECTION_AREA a ON a.ID = i.AREA_ID
        WHERE f.ID = :id`,
      { id: Number(fileId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const fileRow = current.rows?.[0];
    if (!fileRow) {
      await connection.rollback();
      return false;
    }

    const lockedForm = await _requireDraftForm(connection, fileRow.FORM_ID);
    if (!lockedForm) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `DELETE FROM PM.PM_SELECTION_FILE WHERE ID = :id`,
      { id: Number(fileId) },
      { autoCommit: false },
    );

    await _touchForm(connection, fileRow.FORM_ID, userId);
    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// COPY
// ─────────────────────────────────────────────
export async function copyForm(sourceId, data, userId) {
  const connection = await getConnection();
  try {
    const source = await _fetchFormHeader(connection, sourceId);
    if (!source) {
      await connection.rollback();
      return null;
    }

    const has = (key) => Object.prototype.hasOwnProperty.call(data, key);
    const isTemplate = has("IS_TEMPLATE")
      ? String(data.IS_TEMPLATE).toUpperCase()
      : source.IS_TEMPLATE;
    const pId =
      isTemplate === "Y" ? null : has("P_ID") ? data.P_ID : source.P_ID;
    const title = has("TITLE") ? data.TITLE : source.TITLE;
    const levelNo = has("LEVEL_NO")
      ? data.LEVEL_NO
      : _incrementLevelNo(source.LEVEL_NO);
    const copyFiles = String(data.COPY_FILES ?? "N").toUpperCase() === "Y";

    const insertResult = await connection.execute(
      `INSERT INTO PM.PM_SELECTION_FORM
       (P_ID, TITLE, LEVEL_NO, IS_TEMPLATE, STATUS, COPIED_FROM_ID,
        CREATED_BY, UPDATED_BY)
       VALUES
       (:p_id, :title, :level_no, :is_template, 'DRAFT', :copied_from_id,
        :created_by, :updated_by)
       RETURNING ID INTO :new_id`,
      {
        p_id: pId,
        title,
        level_no: levelNo ?? null,
        is_template: isTemplate,
        copied_from_id: Number(sourceId),
        created_by: Number(userId ?? 0),
        updated_by: Number(userId ?? 0),
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false },
    );

    const newFormId = insertResult.outBinds.new_id[0];

    const areaResult = await connection.execute(
      `SELECT ID, PARENT_ID, NAME, SORT_ORDER
         FROM PM.PM_SELECTION_AREA
        WHERE FORM_ID = :form_id`,
      { form_id: Number(sourceId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    let pending = [...(areaResult.rows || [])];
    const areaMap = new Map();

    while (pending.length) {
      const ready = pending.filter(
        (area) =>
          area.PARENT_ID == null || areaMap.has(Number(area.PARENT_ID)),
      );
      if (!ready.length) {
        throw new Error(
          "Cannot copy selection areas because their parent hierarchy is invalid.",
        );
      }

      for (const area of ready) {
        const newParentId =
          area.PARENT_ID == null
            ? null
            : areaMap.get(Number(area.PARENT_ID));

        const areaInsert = await connection.execute(
          `INSERT INTO PM.PM_SELECTION_AREA
           (FORM_ID, PARENT_ID, NAME, FIELDS_JSON, SORT_ORDER)
           VALUES
           (:form_id, :parent_id, :name, EMPTY_CLOB(), :sort_order)
           RETURNING ID INTO :new_id`,
          {
            form_id: newFormId,
            parent_id: newParentId ?? null,
            name: area.NAME ?? null,
            sort_order: area.SORT_ORDER ?? null,
            new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          },
          { autoCommit: false },
        );

        const newAreaId = areaInsert.outBinds.new_id[0];

        await connection.execute(
          `UPDATE PM.PM_SELECTION_AREA
              SET FIELDS_JSON = (
                SELECT FIELDS_JSON FROM PM.PM_SELECTION_AREA WHERE ID = :old_area_id
              )
            WHERE ID = :new_area_id`,
          { old_area_id: Number(area.ID), new_area_id: newAreaId },
          { autoCommit: false },
        );

        areaMap.set(Number(area.ID), newAreaId);
      }

      pending = pending.filter((area) => !areaMap.has(Number(area.ID)));
    }

    for (const [oldAreaId, newAreaId] of areaMap) {
      await _copyAreaContents(
        connection,
        oldAreaId,
        newAreaId,
        copyFiles,
        userId,
      );
    }

    await connection.commit();
    return { id: newFormId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function copyArea(areaId, data, userId) {
  const connection = await getConnection();
  try {
    const areaResult = await connection.execute(
      `SELECT ID, FORM_ID, PARENT_ID, NAME
         FROM PM.PM_SELECTION_AREA
        WHERE ID = :id`,
      { id: Number(areaId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const sourceArea = areaResult.rows?.[0];
    if (!sourceArea) {
      await connection.rollback();
      return null;
    }

    const lockedForm = await _requireDraftForm(connection, sourceArea.FORM_ID);
    if (!lockedForm) {
      await connection.rollback();
      return null;
    }

    const copyFiles = String(data.COPY_FILES ?? "N").toUpperCase() === "Y";

    const sortResult = await connection.execute(
      `SELECT NVL(MAX(SORT_ORDER), -1) + 1 AS NEXT_SORT
         FROM PM.PM_SELECTION_AREA
        WHERE FORM_ID = :form_id
          AND NVL(PARENT_ID, 0) = NVL(:parent_id, 0)`,
      {
        form_id: Number(sourceArea.FORM_ID),
        parent_id: sourceArea.PARENT_ID ?? null,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const rootSort = sortResult.rows?.[0]?.NEXT_SORT ?? 0;

    const treeResult = await connection.execute(
      `SELECT ID, PARENT_ID, NAME, SORT_ORDER
         FROM PM.PM_SELECTION_AREA
        START WITH ID = :root_id
        CONNECT BY PRIOR ID = PARENT_ID
        ORDER SIBLINGS BY SORT_ORDER, ID`,
      { root_id: Number(areaId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const areaMap = new Map();
    let newRootId = null;

    for (const area of treeResult.rows || []) {
      const isRoot = Number(area.ID) === Number(areaId);
      const newParentId = isRoot
        ? sourceArea.PARENT_ID ?? null
        : areaMap.get(Number(area.PARENT_ID)) ?? null;
      const name = isRoot ? `${area.NAME} (Copy)` : area.NAME;
      const sortOrder = isRoot ? Number(rootSort) : area.SORT_ORDER;

      const insertResult = await connection.execute(
        `INSERT INTO PM.PM_SELECTION_AREA
         (FORM_ID, PARENT_ID, NAME, FIELDS_JSON, SORT_ORDER)
         VALUES
         (:form_id, :parent_id, :name, EMPTY_CLOB(), :sort_order)
         RETURNING ID INTO :new_id`,
        {
          form_id: Number(sourceArea.FORM_ID),
          parent_id: newParentId,
          name,
          sort_order: sortOrder,
          new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: false },
      );

      const newAreaId = insertResult.outBinds.new_id[0];

      await connection.execute(
        `UPDATE PM.PM_SELECTION_AREA
            SET FIELDS_JSON = (
              SELECT FIELDS_JSON FROM PM.PM_SELECTION_AREA WHERE ID = :old_area_id
            )
          WHERE ID = :new_area_id`,
        { old_area_id: Number(area.ID), new_area_id: newAreaId },
        { autoCommit: false },
      );
      areaMap.set(Number(area.ID), newAreaId);
      if (isRoot) newRootId = newAreaId;

      await _copyAreaContents(
        connection,
        Number(area.ID),
        newAreaId,
        copyFiles,
        userId,
      );
    }

    await connection.commit();
    return { id: newRootId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// FORM STATUS ACTIONS
// ─────────────────────────────────────────────
export async function publishForm(formId, userId) {
  const connection = await getConnection();
  try {
    const form = await _fetchFormHeader(connection, formId);
    if (!form) {
      await connection.rollback();
      return null;
    }

    if (form.STATUS !== "DRAFT") {
      throw _conflict("Only draft forms can be published.");
    }
    if (form.IS_TEMPLATE === "Y") {
      throw _conflict("Template forms cannot be published.");
    }
    if (form.P_ID == null) {
      throw _conflict("Form must be linked to a project before publishing.");
    }

    const areaResult = await connection.execute(
      `SELECT COUNT(*) AS AREA_COUNT
         FROM PM.PM_SELECTION_AREA
        WHERE FORM_ID = :form_id`,
      { form_id: Number(formId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    if (!areaResult.rows?.[0]?.AREA_COUNT) {
      throw _conflict("Form must have at least one area before publishing.");
    }

    await connection.execute(
      `UPDATE PM.PM_SELECTION_FORM
          SET STATUS = 'PUBLISHED',
              PUBLISHED_DATE = SYSDATE,
              PUBLISHED_BY = :published_by,
              UPDATED_BY = :published_by,
              UPDATED_DATE = SYSDATE
        WHERE ID = :id`,
      {
        published_by: Number(userId ?? 0),
        id: Number(formId),
      },
      { autoCommit: false },
    );

    const updated = await _fetchFormHeader(connection, formId);
    await connection.commit();
    return updated;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function reopenForm(formId, userId) {
  const connection = await getConnection();
  try {
    const form = await _fetchFormHeader(connection, formId);
    if (!form) {
      await connection.rollback();
      return null;
    }

    if (form.STATUS !== "PUBLISHED" && form.STATUS !== "CONFIRMED") {
      throw _conflict("Only published or confirmed forms can be reopened.");
    }

    await connection.execute(
      `UPDATE PM.PM_SELECTION_FORM
          SET STATUS = 'DRAFT',
              PUBLISHED_DATE = NULL,
              PUBLISHED_BY = NULL,
              CONFIRMED_DATE = NULL,
              CONFIRMED_BY = NULL,
              UPDATED_BY = :updated_by,
              UPDATED_DATE = SYSDATE
        WHERE ID = :id`,
      {
        updated_by: Number(userId ?? 0),
        id: Number(formId),
      },
      { autoCommit: false },
    );

    await connection.execute(
      `UPDATE PM.PM_SELECTION_ITEM
          SET CUSTOMER_CONFIRMED = 'N',
              CUSTOMER_NOTE = NULL
        WHERE AREA_ID IN (
          SELECT ID FROM PM.PM_SELECTION_AREA WHERE FORM_ID = :form_id
        )`,
      { form_id: Number(formId) },
      { autoCommit: false },
    );

    const updated = await _fetchFormHeader(connection, formId);
    await connection.commit();
    return updated;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// CUSTOMER ACTIONS
// ─────────────────────────────────────────────
export async function confirmItem(itemId, data) {
  const connection = await getConnection();
  try {
    const current = await connection.execute(
      `SELECT i.ID, a.FORM_ID, f.STATUS
         FROM PM.PM_SELECTION_ITEM i
         JOIN PM.PM_SELECTION_AREA a ON a.ID = i.AREA_ID
         JOIN PM.PM_SELECTION_FORM f ON f.ID = a.FORM_ID
        WHERE i.ID = :id`,
      { id: Number(itemId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const itemRow = current.rows?.[0];
    if (!itemRow) {
      await connection.rollback();
      return null;
    }
    if (itemRow.STATUS !== "PUBLISHED") {
      throw _conflict("Only published forms can be confirmed.");
    }

    const set = ["CUSTOMER_CONFIRMED = :customer_confirmed"];
    const binds = {
      id: Number(itemId),
      customer_confirmed: data.CUSTOMER_CONFIRMED,
    };

    if (Object.prototype.hasOwnProperty.call(data, "CUSTOMER_NOTE")) {
      set.push("CUSTOMER_NOTE = :customer_note");
      binds.customer_note = data.CUSTOMER_NOTE ?? null;
    }

    await connection.execute(
      `UPDATE PM.PM_SELECTION_ITEM
          SET ${set.join(", ")}
        WHERE ID = :id`,
      binds,
      { autoCommit: false },
    );

    const item = await _fetchItem(connection, itemId);
    await connection.commit();
    return item;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function confirmAll(formId, userId) {
  const connection = await getConnection();
  try {
    const form = await _fetchFormHeader(connection, formId);
    if (!form) {
      await connection.rollback();
      return null;
    }
    if (form.STATUS !== "PUBLISHED") {
      throw _conflict("Only published forms can be confirmed.");
    }

    await connection.execute(
      `UPDATE PM.PM_SELECTION_ITEM
          SET CUSTOMER_CONFIRMED = 'Y'
        WHERE AREA_ID IN (
          SELECT ID FROM PM.PM_SELECTION_AREA WHERE FORM_ID = :form_id
        )`,
      { form_id: Number(formId) },
      { autoCommit: false },
    );

    await connection.execute(
      `UPDATE PM.PM_SELECTION_FORM
          SET STATUS = 'CONFIRMED',
              CONFIRMED_DATE = SYSDATE,
              CONFIRMED_BY = :confirmed_by,
              UPDATED_BY = :confirmed_by,
              UPDATED_DATE = SYSDATE
        WHERE ID = :id`,
      {
        confirmed_by: Number(userId ?? 0),
        id: Number(formId),
      },
      { autoCommit: false },
    );

    const updated = await _fetchFormHeader(connection, formId);
    await connection.commit();
    return updated;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────
async function _requireDraftForm(connection, formId) {
  const result = await connection.execute(
    `SELECT ID, STATUS, IS_TEMPLATE
       FROM PM.PM_SELECTION_FORM
      WHERE ID = :id`,
    { id: Number(formId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const form = result.rows?.[0];
  if (!form) return null;

  if (form.IS_TEMPLATE !== "Y" && form.STATUS !== "DRAFT") {
    throw _conflict("Form is locked");
  }

  return form;
}

async function _copyAreaContents(
  connection,
  oldAreaId,
  newAreaId,
  copyFiles,
  userId,
) {
  const itemResult = await connection.execute(
    `SELECT ID, SORT_ORDER
       FROM PM.PM_SELECTION_ITEM
      WHERE AREA_ID = :area_id
      ORDER BY SORT_ORDER, ID`,
    { area_id: Number(oldAreaId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  for (const item of itemResult.rows || []) {
    const insertResult = await connection.execute(
      `INSERT INTO PM.PM_SELECTION_ITEM
       (AREA_ID, VALUES_JSON, CUSTOMER_CONFIRMED, CUSTOMER_NOTE, SORT_ORDER)
       VALUES
       (:new_area_id, EMPTY_CLOB(), 'N', NULL, :sort_order)
       RETURNING ID INTO :new_id`,
      {
        new_area_id: Number(newAreaId),
        sort_order: item.SORT_ORDER ?? null,
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false },
    );

    const newItemId = insertResult.outBinds.new_id[0];

    await connection.execute(
      `UPDATE PM.PM_SELECTION_ITEM
          SET VALUES_JSON = (
            SELECT VALUES_JSON FROM PM.PM_SELECTION_ITEM WHERE ID = :old_item_id
          )
        WHERE ID = :new_item_id`,
      { old_item_id: Number(item.ID), new_item_id: newItemId },
      { autoCommit: false },
    );

    if (copyFiles) {
      await connection.execute(
        `INSERT INTO PM.PM_SELECTION_FILE
         (ITEM_ID, FIELD_KEY, FILE_NAME, MIME_TYPE, FILE_SIZE,
          DOC_FILE, CREATED_BY, CREATED_DATE)
         SELECT :new_item_id, FIELD_KEY, FILE_NAME, MIME_TYPE, FILE_SIZE,
                DOC_FILE, :created_by, SYSDATE
           FROM PM.PM_SELECTION_FILE
          WHERE ITEM_ID = :old_item_id`,
        {
          new_item_id: newItemId,
          created_by: Number(userId ?? 0),
          old_item_id: Number(item.ID),
        },
        { autoCommit: false },
      );
    }
  }
}

function _incrementLevelNo(value) {
  if (value === null || value === undefined) return null;
  return String(value).replace(
    /(\d+)(\s*)$/,
    (match, number, spaces) => String(Number(number) + 1) + spaces,
  );
}

function _conflict(message) {
  const err = new Error(message);
  err.statusCode = 409;
  return err;
}

async function _fetchFormHeader(connection, formId, ownerId = null) {
  let sql = `SELECT ${FORM_COLUMNS}
       FROM PM.PM_SELECTION_FORM
      WHERE ID = :id`;
  const binds = { id: Number(formId) };

  if (ownerId !== null && ownerId !== undefined) {
    sql += `
        AND IS_TEMPLATE = 'N'
        AND STATUS IN ('PUBLISHED', 'CONFIRMED')
        AND EXISTS (
          SELECT 1 FROM PM.PM_OWNER_INFO oi
          WHERE oi.ID = :owner_id AND oi.PROJECT_ID = PM_SELECTION_FORM.P_ID
        )`;
    binds.owner_id = Number(ownerId);
  }

  const result = await connection.execute(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });
  return result.rows?.[0] || null;
}

async function _fetchForm(connection, formId, ownerId = null) {
  const form = await _fetchFormHeader(connection, formId, ownerId);
  if (!form) return null;

  const areaResult = await connection.execute(
    `SELECT ID, FORM_ID, PARENT_ID, NAME, FIELDS_JSON, SORT_ORDER
       FROM PM.PM_SELECTION_AREA
      WHERE FORM_ID = :form_id
      ORDER BY SORT_ORDER, ID`,
    { form_id: Number(formId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const itemResult = await connection.execute(
    `SELECT i.ID, i.AREA_ID, i.VALUES_JSON, i.CUSTOMER_CONFIRMED,
            i.CUSTOMER_NOTE, i.SORT_ORDER
       FROM PM.PM_SELECTION_ITEM i
       JOIN PM.PM_SELECTION_AREA a ON a.ID = i.AREA_ID
      WHERE a.FORM_ID = :form_id
      ORDER BY i.SORT_ORDER, i.ID`,
    { form_id: Number(formId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const fileResult = await connection.execute(
    `SELECT f.ID, f.ITEM_ID, f.FIELD_KEY, f.FILE_NAME, f.MIME_TYPE,
            f.FILE_SIZE, f.CREATED_BY,
            TO_CHAR(f.CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE
       FROM PM.PM_SELECTION_FILE f
       JOIN PM.PM_SELECTION_ITEM i ON i.ID = f.ITEM_ID
       JOIN PM.PM_SELECTION_AREA a ON a.ID = i.AREA_ID
      WHERE a.FORM_ID = :form_id
      ORDER BY f.ID`,
    { form_id: Number(formId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const filesByItem = new Map();
  for (const file of fileResult.rows || []) {
    const key = Number(file.ITEM_ID);
    const list = filesByItem.get(key) || [];
    list.push(file);
    filesByItem.set(key, list);
  }

  const itemsByArea = new Map();
  for (const item of itemResult.rows || []) {
    const parsedItem = {
      ...item,
      VALUES_JSON: _parseJson(item.VALUES_JSON),
      FILES: filesByItem.get(Number(item.ID)) || [],
    };
    const key = Number(item.AREA_ID);
    const list = itemsByArea.get(key) || [];
    list.push(parsedItem);
    itemsByArea.set(key, list);
  }

  const areas = (areaResult.rows || []).map((area) => ({
    ...area,
    FIELDS_JSON: _parseJson(area.FIELDS_JSON),
    ITEMS: itemsByArea.get(Number(area.ID)) || [],
    CHILDREN: [],
  }));

  const areaById = new Map(areas.map((area) => [Number(area.ID), area]));
  const rootAreas = [];
  for (const area of areas) {
    const parent =
      area.PARENT_ID != null
        ? areaById.get(Number(area.PARENT_ID))
        : null;

    if (parent) {
      parent.CHILDREN.push(area);
    } else {
      rootAreas.push(area);
    }
  }

  form.AREAS = rootAreas;
  return form;
}

async function _fetchArea(connection, areaId) {
  const result = await connection.execute(
    `SELECT ID, FORM_ID, PARENT_ID, NAME, FIELDS_JSON, SORT_ORDER
       FROM PM.PM_SELECTION_AREA
      WHERE ID = :id`,
    { id: Number(areaId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const area = result.rows?.[0];
  if (!area) return null;

  area.FIELDS_JSON = _parseJson(area.FIELDS_JSON);
  return area;
}

async function _fetchItem(connection, itemId) {
  const result = await connection.execute(
    `SELECT ID, AREA_ID, VALUES_JSON, CUSTOMER_CONFIRMED, CUSTOMER_NOTE, SORT_ORDER
       FROM PM.PM_SELECTION_ITEM
      WHERE ID = :id`,
    { id: Number(itemId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const item = result.rows?.[0];
  if (!item) return null;

  item.VALUES_JSON = _parseJson(item.VALUES_JSON);

  const fileResult = await connection.execute(
    `SELECT ID, ITEM_ID, FIELD_KEY, FILE_NAME, MIME_TYPE, FILE_SIZE,
            CREATED_BY,
            TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE
       FROM PM.PM_SELECTION_FILE
      WHERE ITEM_ID = :item_id
      ORDER BY ID`,
    { item_id: Number(itemId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  item.FILES = fileResult.rows || [];

  return item;
}

async function _fetchFile(connection, fileId) {
  const result = await connection.execute(
    `SELECT ID, ITEM_ID, FIELD_KEY, FILE_NAME, MIME_TYPE, FILE_SIZE,
            CREATED_BY,
            TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE
       FROM PM.PM_SELECTION_FILE
      WHERE ID = :id`,
    { id: Number(fileId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  return result.rows?.[0] || null;
}

async function _touchForm(connection, formId, userId) {
  await connection.execute(
    `UPDATE PM.PM_SELECTION_FORM
        SET UPDATED_BY = :updated_by,
            UPDATED_DATE = SYSDATE
      WHERE ID = :id`,
    {
      updated_by: Number(userId ?? 0),
      id: Number(formId),
    },
    { autoCommit: false },
  );
}

function _parseJson(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function _jsonText(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
    } catch {
      throw _badRequest("FIELDS_JSON and VALUES_JSON must be valid JSON.");
    }
    return trimmed;
  }

  return JSON.stringify(value);
}

function _badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function _writeStringToClob(lob, value) {
  return new Promise((resolve, reject) => {
    lob.on("error", reject);
    lob.on("finish", resolve);
    lob.write(value ?? "");
    lob.end();
  });
}

function _writeBufferToBlob(lob, buffer) {
  return new Promise((resolve, reject) => {
    lob.on("error", reject);
    lob.on("finish", resolve);
    lob.write(buffer);
    lob.end();
  });
}

function _blobToBuffer(lob) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    lob.on("data", (chunk) => chunks.push(chunk));
    lob.on("end", () => resolve(Buffer.concat(chunks)));
    lob.on("error", reject);
  });
}
