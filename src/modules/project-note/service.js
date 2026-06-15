import { poolExecute, oracledb, getPool } from "../../config/db.js";

export async function getNotesByProject(pId, contractorTypeIds) {
  let sql = `
    SELECT
      n.NOTE_ID,
      n.P_ID,
      n.DESCRIPTION,
      n.CREATED_BY,
      n.CREATION_DATE,
      LISTAGG(nc.CONTRACTOR_TYPE_ID, ',') WITHIN GROUP (ORDER BY nc.CONTRACTOR_TYPE_ID) AS CONTRACTOR_TYPE_IDS
    FROM PM_PROJECT_NOTE n
    LEFT JOIN PM_PROJECT_NOTE_CONTRACTOR_TYPE nc
      ON nc.NOTE_ID = n.NOTE_ID
    WHERE n.P_ID = :pId
  `;

  const binds = { pId };

  if (Array.isArray(contractorTypeIds) && contractorTypeIds.length > 0) {
    const placeholders = contractorTypeIds.map((_, idx) => `:ct${idx}`).join(", ");
    sql += `
      AND n.NOTE_ID IN (
        SELECT NOTE_ID FROM PM_PROJECT_NOTE_CONTRACTOR_TYPE
        WHERE CONTRACTOR_TYPE_ID IN (${placeholders})
      )
    `;
    contractorTypeIds.forEach((ctId, idx) => { binds[`ct${idx}`] = ctId; });
  }

  sql += `
    GROUP BY n.NOTE_ID, n.P_ID, n.DESCRIPTION, n.CREATED_BY, n.CREATION_DATE
    ORDER BY n.CREATION_DATE DESC
  `;

  const result = await poolExecute(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });

  const notes = result.rows.map((row) => ({
    ...row,
    CONTRACTOR_TYPE_IDS: row.CONTRACTOR_TYPE_IDS
      ? row.CONTRACTOR_TYPE_IDS.split(",").map(Number)
      : [],
  }));

  if (notes.length === 0) return notes;

  // Attach doc metadata for each note
  const noteIds = notes.map((n) => n.NOTE_ID);
  const placeholders = noteIds.map((_, idx) => `:n${idx}`).join(", ");
  const docBinds = {};
  noteIds.forEach((id, idx) => { docBinds[`n${idx}`] = id; });

  const docSql = `
    SELECT ID, NOTE_ID, FILE_NAME, CONTENT_TYPE, CREATION_DATE, CREATION_BY
    FROM PM_PROJECT_NOTE_DOC
    WHERE NOTE_ID IN (${placeholders})
    ORDER BY CREATION_DATE ASC
  `;

  const docResult = await poolExecute(docSql, docBinds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });

  const docsByNote = {};
  for (const doc of docResult.rows) {
    if (!docsByNote[doc.NOTE_ID]) docsByNote[doc.NOTE_ID] = [];
    docsByNote[doc.NOTE_ID].push(doc);
  }

  return notes.map((note) => ({
    ...note,
    DOCS: docsByNote[note.NOTE_ID] || [],
  }));
}

export async function getNoteById(noteId) {
  const noteSql = `
    SELECT NOTE_ID, P_ID, DESCRIPTION, CREATED_BY, CREATION_DATE
    FROM PM_PROJECT_NOTE
    WHERE NOTE_ID = :noteId
  `;

  const noteResult = await poolExecute(
    noteSql,
    { noteId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (noteResult.rows.length === 0) return null;

  const ctSql = `
    SELECT CONTRACTOR_TYPE_ID
    FROM PM_PROJECT_NOTE_CONTRACTOR_TYPE
    WHERE NOTE_ID = :noteId
  `;

  const ctResult = await poolExecute(
    ctSql,
    { noteId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const docSql = `
    SELECT ID, NOTE_ID, FILE_NAME, CONTENT_TYPE, CREATION_DATE, CREATION_BY
    FROM PM_PROJECT_NOTE_DOC
    WHERE NOTE_ID = :noteId
    ORDER BY CREATION_DATE ASC
  `;

  const docResult = await poolExecute(
    docSql,
    { noteId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return {
    ...noteResult.rows[0],
    CONTRACTOR_TYPE_IDS: ctResult.rows.map((r) => r.CONTRACTOR_TYPE_ID),
    DOCS: docResult.rows,
  };
}

export async function getDocById(docId) {
  const sql = `
    SELECT ID, NOTE_ID, DOC_FILE, FILE_NAME, CONTENT_TYPE
    FROM PM_PROJECT_NOTE_DOC
    WHERE ID = :docId
  `;

  const result = await poolExecute(
    sql,
    { docId },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchInfo: { DOC_FILE: { type: oracledb.BUFFER } },
    }
  );

  if (result.rows.length === 0) return null;
  return result.rows[0];
}

async function insertDoc(conn, { noteId, fileBuffer, fileName, contentType, createdBy }) {
  const insertDocSql = `
    INSERT INTO PM_PROJECT_NOTE_DOC
      (NOTE_ID, DOC_FILE, FILE_NAME, CONTENT_TYPE, CREATION_DATE, CREATION_BY)
    VALUES
      (:noteId, :docFile, :fileName, :contentType, SYSDATE, :createdBy)
  `;

  await conn.execute(
    insertDocSql,
    {
      noteId,
      docFile: { val: fileBuffer, type: oracledb.BUFFER },
      fileName,
      contentType,
      createdBy,
    },
    { autoCommit: false }
  );
}

export async function createNote({ pId, description, createdBy, contractorTypeIds, files }) {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const insertNoteSql = `
      INSERT INTO PM_PROJECT_NOTE
        (P_ID, DESCRIPTION, CREATED_BY, CREATION_DATE)
      VALUES
        (:pId, :description, :createdBy, SYSDATE)
      RETURNING NOTE_ID INTO :noteId
    `;

    const result = await conn.execute(
      insertNoteSql,
      {
        pId,
        description,
        createdBy,
        noteId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const noteId = result.outBinds.noteId[0];

    if (Array.isArray(contractorTypeIds) && contractorTypeIds.length > 0) {
      const insertCtSql = `
        INSERT INTO PM_PROJECT_NOTE_CONTRACTOR_TYPE (NOTE_ID, CONTRACTOR_TYPE_ID)
        VALUES (:noteId, :contractorTypeId)
      `;
      for (const contractorTypeId of contractorTypeIds) {
        await conn.execute(insertCtSql, { noteId, contractorTypeId }, { autoCommit: false });
      }
    }

    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        await insertDoc(conn, {
          noteId,
          fileBuffer: file.buffer,
          fileName: file.originalname,
          contentType: file.mimetype,
          createdBy,
        });
      }
    }

    await conn.commit();
    return getNoteById(noteId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

export async function updateNote(noteId, { description, contractorTypeIds, files, createdBy }) {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    if (description !== undefined) {
      await conn.execute(
        `UPDATE PM_PROJECT_NOTE SET DESCRIPTION = :description WHERE NOTE_ID = :noteId`,
        { description, noteId },
        { autoCommit: false }
      );
    }

    if (Array.isArray(contractorTypeIds)) {
      await conn.execute(
        `DELETE FROM PM_PROJECT_NOTE_CONTRACTOR_TYPE WHERE NOTE_ID = :noteId`,
        { noteId },
        { autoCommit: false }
      );

      const insertCtSql = `
        INSERT INTO PM_PROJECT_NOTE_CONTRACTOR_TYPE (NOTE_ID, CONTRACTOR_TYPE_ID)
        VALUES (:noteId, :contractorTypeId)
      `;
      for (const contractorTypeId of contractorTypeIds) {
        await conn.execute(insertCtSql, { noteId, contractorTypeId }, { autoCommit: false });
      }
    }

    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        await insertDoc(conn, {
          noteId,
          fileBuffer: file.buffer,
          fileName: file.originalname,
          contentType: file.mimetype,
          createdBy,
        });
      }
    }

    await conn.commit();
    return getNoteById(noteId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

export async function deleteNote(noteId) {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.execute(
      `DELETE FROM PM_PROJECT_NOTE_CONTRACTOR_TYPE WHERE NOTE_ID = :noteId`,
      { noteId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM PM_PROJECT_NOTE_DOC WHERE NOTE_ID = :noteId`,
      { noteId },
      { autoCommit: false }
    );
    const result = await conn.execute(
      `DELETE FROM PM_PROJECT_NOTE WHERE NOTE_ID = :noteId`,
      { noteId },
      { autoCommit: false }
    );

    await conn.commit();
    return result.rowsAffected > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

export async function deleteDoc(docId) {
  const result = await poolExecute(
    `DELETE FROM PM_PROJECT_NOTE_DOC WHERE ID = :docId`,
    { docId },
    { autoCommit: true }
  );
  return result.rowsAffected > 0;
}