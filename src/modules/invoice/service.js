import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function insertInvoice(data, file) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `INSERT INTO PM.PM_INVOICE
       (PROJECT_ID, AREA_TYPE, AMOUNT, PURCHASED_BY, CONTRACTOR_ID, MATERIAL_TYPE, MATERIAL_OTHER,
        PAYMENT_METHOD, PAYMENT_REF, RECEIPT_BLOB, RECEIPT_FILENAME, RECEIPT_MIME_TYPE, RECEIPT_SIZE,
        STATUS, CREATED_BY)
       VALUES
       (:PROJECT_ID, :AREA_TYPE, :AMOUNT, :PURCHASED_BY, :CONTRACTOR_ID, :MATERIAL_TYPE, :MATERIAL_OTHER,
        :PAYMENT_METHOD, :PAYMENT_REF, EMPTY_BLOB(), :RECEIPT_FILENAME, :RECEIPT_MIME_TYPE, :RECEIPT_SIZE,
        :STATUS, :CREATED_BY)
       RETURNING ID, RECEIPT_BLOB INTO :NEW_ID, :REC_BLOB`,
      {
        PROJECT_ID: data.PROJECT_ID != null ? Number(data.PROJECT_ID) : null,
        AREA_TYPE: data.AREA_TYPE ?? null,
        AMOUNT: data.AMOUNT != null ? Number(data.AMOUNT) : null,
        PURCHASED_BY: data.PURCHASED_BY ?? null,
        CONTRACTOR_ID: data.CONTRACTOR_ID != null ? Number(data.CONTRACTOR_ID) : null,
        MATERIAL_TYPE: data.MATERIAL_TYPE ?? null,
        MATERIAL_OTHER: data.MATERIAL_OTHER ?? null,
        PAYMENT_METHOD: data.PAYMENT_METHOD ?? null,
        PAYMENT_REF: data.PAYMENT_REF ?? null,
        RECEIPT_FILENAME: file?.originalname ?? null,
        RECEIPT_MIME_TYPE: file?.mimetype ?? null,
        RECEIPT_SIZE: file?.size ?? null,
        // STATUS: data.STATUS != null ? Number(data.STATUS) : 1,
        STATUS: 1,
        CREATED_BY: data.CREATED_BY != null ? Number(data.CREATED_BY) : null,
        NEW_ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        REC_BLOB: { dir: oracledb.BIND_OUT, type: oracledb.BLOB },
      },
      { autoCommit: false }
    );

    const invoiceId = result.outBinds.NEW_ID[0];
    const lob = result.outBinds.REC_BLOB[0];

    // if (file?.buffer && invoiceId && lob && typeof lob.writeBuffer === "function") {
    //   await lob.writeBuffer(file.buffer);
    // }

    if (file?.buffer && invoiceId && lob) {
  await new Promise((resolve, reject) => {
    lob.on("error", reject);
    lob.on("finish", resolve);
    lob.end(file.buffer);
  });
}

    await connection.commit();
    return invoiceId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// export async function searchInvoices({ projectId, page = 1, limit = 20 }) {
//   const connection = await getConnection();
//   try {
//     const pageNo = Number(page || 1);
//     const pageSize = Number(limit || 20);
//     const offset = (pageNo - 1) * pageSize;

//     let sql = `
//       SELECT
//         ID, PROJECT_ID, AREA_TYPE, AMOUNT, PURCHASED_BY, CONTRACTOR_ID, MATERIAL_TYPE,
//         MATERIAL_OTHER, PAYMENT_METHOD, PAYMENT_REF, RECEIPT_FILENAME, RECEIPT_MIME_TYPE,
//         RECEIPT_SIZE, STATUS, CREATED_BY,
//         TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT
//       FROM PM.PM_INVOICE
//       WHERE STATUS = 1`;

//     const binds = {};

//     if (projectId) {
//       sql += ` AND PROJECT_ID = :projectId`;
//       binds.projectId = Number(projectId);
//     }

//     sql += ` ORDER BY CREATED_AT DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`;
//     binds.offset = offset;
//     binds.limit = pageSize;

//     const result = await connection.execute(sql, binds, {
//       outFormat: oracledb.OUT_FORMAT_OBJECT,
//     });

//     return result.rows || [];
//   } finally {
//     await connection.close();
//   }
// }
export async function searchInvoices({ projectId, page = 1, limit = 20 }) {
  const connection = await getConnection();
  try {
    const pageNo = Number(page || 1);
    const pageSize = Number(limit || 20);
    const offset = (pageNo - 1) * pageSize;

    let whereClause = ` WHERE STATUS = 1`;
    const binds = {};

    if (projectId) {
      whereClause += ` AND PROJECT_ID = :projectId`;
      binds.projectId = Number(projectId);
    }

    const countResult = await connection.execute(
      `SELECT COUNT(*) AS TOTAL FROM PM.PM_INVOICE${whereClause}`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const total = countResult.rows?.[0]?.TOTAL || 0;

    const dataSql = `
      SELECT
        ID, PROJECT_ID, AREA_TYPE, AMOUNT, PURCHASED_BY, CONTRACTOR_ID, MATERIAL_TYPE,
        MATERIAL_OTHER, PAYMENT_METHOD, PAYMENT_REF, RECEIPT_FILENAME, RECEIPT_MIME_TYPE,
        RECEIPT_SIZE, STATUS, CREATED_BY,
        TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT
      FROM PM.PM_INVOICE
      ${whereClause}
      ORDER BY CREATED_AT DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`;

    const dataResult = await connection.execute(
      dataSql,
      { ...binds, offset, limit: pageSize },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      rows: dataResult.rows || [],
      total,
      page: pageNo,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } finally {
    await connection.close();
  }
}

export async function getInvoiceById(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT
         ID, PROJECT_ID, AREA_TYPE, AMOUNT, PURCHASED_BY, CONTRACTOR_ID, MATERIAL_TYPE,
         MATERIAL_OTHER, PAYMENT_METHOD, PAYMENT_REF, RECEIPT_FILENAME, RECEIPT_MIME_TYPE,
         RECEIPT_SIZE, STATUS, CREATED_BY,
         TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT
       FROM PM.PM_INVOICE
       WHERE ID = :id AND STATUS = 1`,
      { id: Number(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows?.[0] || null;
  } finally {
    await connection.close();
  }
}

export async function getInvoiceReceipt(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT RECEIPT_BLOB, RECEIPT_FILENAME, RECEIPT_MIME_TYPE
       FROM PM.PM_INVOICE
       WHERE ID = :id AND STATUS = 1`,
      { id: Number(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row = result.rows?.[0];
    if (!row) return null;

    const blob = row.RECEIPT_BLOB;
    let buffer = null;

    if (Buffer.isBuffer(blob)) {
      buffer = Buffer.from(blob);
    } else if (blob && typeof blob.getData === "function") {
      buffer = await blob.getData();
    } else if (blob && typeof blob.read === "function") {
      buffer = await blob.read();
    }

    if (!buffer || !buffer.length) return null;

    return {
      fileName: row.RECEIPT_FILENAME,
      mimeType: row.RECEIPT_MIME_TYPE,
      buffer,
    };
  } finally {
    await connection.close();
  }
}

export async function updateInvoice(id, data = {}, file) {
  const connection = await getConnection();
  try {
    const allowedFields = [
      "PROJECT_ID",
      "AREA_TYPE",
      "AMOUNT",
      "PURCHASED_BY",
      "CONTRACTOR_ID",
      "MATERIAL_TYPE",
      "MATERIAL_OTHER",
      "PAYMENT_METHOD",
      "PAYMENT_REF",
    //   "STATUS",
      "CREATED_BY",
    ];

    const setClauses = [];
    const binds = { id: Number(id) };

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data, field) && data[field] !== undefined) {
        setClauses.push(`${field} = :${field}`);
        binds[field] = data[field];
      }
    }

    if (file) {
      setClauses.push("RECEIPT_BLOB = EMPTY_BLOB()");
      setClauses.push("RECEIPT_FILENAME = :RECEIPT_FILENAME");
      setClauses.push("RECEIPT_MIME_TYPE = :RECEIPT_MIME_TYPE");
      setClauses.push("RECEIPT_SIZE = :RECEIPT_SIZE");
      binds.RECEIPT_FILENAME = file.originalname ?? null;
      binds.RECEIPT_MIME_TYPE = file.mimetype ?? null;
      binds.RECEIPT_SIZE = file.size ?? null;
    }

    if (!setClauses.length) {
      return 0;
    }

    let result;
    if (file) {
      result = await connection.execute(
        `UPDATE PM.PM_INVOICE
         SET ${setClauses.join(", ")}
         WHERE ID = :id
         RETURNING RECEIPT_BLOB INTO :REC_BLOB`,
        {
          ...binds,
          REC_BLOB: { dir: oracledb.BIND_OUT, type: oracledb.BLOB },
        },
        { autoCommit: false }
      );

    //   const lob = result.outBinds.REC_BLOB[0];
    //   if (lob && typeof lob.writeBuffer === "function") {
    //     await lob.writeBuffer(file.buffer);
    //   }
    const lob = result.outBinds.REC_BLOB[0];
if (lob) {
  await new Promise((resolve, reject) => {
    lob.on("error", reject);
    lob.on("finish", resolve);
    lob.end(file.buffer);
  });
}
    } else {
      result = await connection.execute(
        `UPDATE PM.PM_INVOICE
         SET ${setClauses.join(", ")}
         WHERE ID = :id`,
        binds,
        { autoCommit: false }
      );
    }

    await connection.commit();
    return result.rowsAffected || 0;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function deleteInvoice(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `UPDATE PM.PM_INVOICE
       SET STATUS = 0
       WHERE ID = :id AND STATUS = 1`,
      { id: Number(id) },
      { autoCommit: false }
    );

    await connection.commit();
    return result.rowsAffected || 0;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}
