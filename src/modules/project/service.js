// src\modules\project\service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";
import { sendMail } from "../../utils/mailer.js";
import { bulkContractorTemplate } from "../../tamplate/contractor-email.js";

// ─────────────────────────────────────────────
// PROJECT INSERT  (+ contractor types + docs)
// ─────────────────────────────────────────────
// export async function insertProject(data, files = []) {
//   const connection = await getConnection();
//   try {
//     // 1️⃣ Insert project → get P_ID
//    const result = await connection.execute(
//   `INSERT INTO PM.PM_PROJECT
//    (P_NAME, P_TYPE, P_ADDRESS, ADDRESS, STREET, SUBWRB, POSTCODE, STATE, USER_ID, USER_BY, UPDATED_BY,
//     LOT, DP, INSURANCE_NO, P_ENTATIVE_START_DATE, P_TENTATIVE_END_DATE, P_CODE,
//     DESCRIPTION, FILE_PATH, CERT_UPLOAD_STATUS)
//    VALUES
//    (:P_NAME, :P_TYPE, :P_ADDRESS, :ADDRESS, :STREET, :SUBWRB, :POSTCODE, :STATE, :USER_ID, :USER_BY, :UPDATED_BY,
//     :LOT, :DP, :INSURANCE_NO, :P_ENTATIVE_START_DATE, :P_TENTATIVE_END_DATE, :P_CODE,
//     :DESCRIPTION, :FILE_PATH, 'PENDING')
//    RETURNING P_ID INTO :NEW_P_ID`,
//   {
//     P_NAME:                data.P_NAME ?? "",
//     P_TYPE:                data.P_TYPE ?? null,
//     P_ADDRESS:             data.P_ADDRESS ?? null,
//     ADDRESS:               data.ADDRESS ?? null,   // ✅ নতুন
//     STREET:                data.STREET ?? null,     // ✅ নতুন
//     SUBWRB:                data.SUBWRB ?? null,
//     POSTCODE:              data.POSTCODE ?? null,
//     STATE:                 data.STATE ?? "NSW",     // ✅ default fallback
//     USER_ID:               Number(data.USER_ID ?? 0),
//     USER_BY:               Number(data.USER_BY ?? data.USER_ID ?? 0),
//     UPDATED_BY:            Number(data.UPDATED_BY ?? data.USER_ID ?? 0),
//     LOT:                   data.LOT ?? null,
//     DP:                    data.DP ?? null,
//     INSURANCE_NO:          data.INSURANCE_NO ?? null,
//     P_ENTATIVE_START_DATE: data.P_ENTATIVE_START_DATE ? new Date(data.P_ENTATIVE_START_DATE) : null,
//     P_TENTATIVE_END_DATE:  data.P_TENTATIVE_END_DATE  ? new Date(data.P_TENTATIVE_END_DATE)  : null,
//     P_CODE:                data.P_CODE ?? null,
//     DESCRIPTION:           data.DESCRIPTION ?? null,
//     FILE_PATH:             null,
//     NEW_P_ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
//   },
//   { autoCommit: false }
// );

//     const P_ID = result.outBinds.NEW_P_ID[0];

//     // 2️⃣ FILE_PATH — logical reference (P_ID পাওয়ার পর)
//     const filePath = `/pm/${P_ID}/`;
//     await connection.execute(
//       `UPDATE PM.PM_PROJECT SET FILE_PATH = :fp WHERE P_ID = :pid`,
//       { fp: filePath, pid: P_ID },
//       { autoCommit: false }
//     );

//     // 3️⃣ Contractor Types
//     const contractorTypeIds = _parseIds(data.CONTRACTOR_TYPE_IDS);
//     for (const ctId of contractorTypeIds) {
//       await connection.execute(
//         `INSERT INTO PM.PM_PROJECT_CONTRACTOR_TYPE (P_ID, CONTRACTOR_TYPE_ID)
//          VALUES (:pid, :ctid)`,
//         { pid: P_ID, ctid: Number(ctId) },
//         { autoCommit: false }
//       );
//     }

//     // 4️⃣ Mandatory files → BLOB insert
//     for (const file of files) {
//       await _insertMandatoryDoc(connection, {
//         P_ID,
//         FILE_NAME:   file.originalname,
//         MIME_TYPE:   file.mimetype,
//         FILE_SIZE:   file.size,
//         FILE_BUFFER: file.buffer,   // multer memoryStorage থেকে Buffer
//         CREATION_BY: Number(data.USER_ID ?? 0),
//       });
//     }

//     // 5️⃣ Certificate placeholder rows — one per contractor type
//     for (const ctId of contractorTypeIds) {
//       await _insertCertPlaceholder(connection, {
//         P_ID,
//         CONTRACTOR_TYPE_ID: Number(ctId),
//         CREATION_BY: Number(data.USER_ID ?? 0),
//       });
//     }

//     await connection.commit();
//     return P_ID;
//   } catch (err) {
//     await connection.rollback();
//     throw err;
//   } finally {
//     await connection.close();
//   }
// }
export async function insertProject(data, files = []) {
  const connection = await getConnection();
  try {
    // 0️⃣ Shift every existing row down by one to make room at the top
    await connection.execute(
      `UPDATE PM.PM_PROJECT SET SORT_ORDER = SORT_ORDER + 1`,
      {},
      { autoCommit: false }
    );

    // 1️⃣ Insert project → get P_ID, force SORT_ORDER = 1
    const result = await connection.execute(
      `INSERT INTO PM.PM_PROJECT
       (P_NAME, P_TYPE, P_ADDRESS, ADDRESS, STREET, SUBWRB, POSTCODE, STATE, USER_ID, USER_BY, UPDATED_BY,
        LOT, DP, INSURANCE_NO, P_ENTATIVE_START_DATE, P_TENTATIVE_END_DATE, P_CODE,
        DESCRIPTION, FILE_PATH, CERT_UPLOAD_STATUS, SORT_ORDER)
       VALUES
       (:P_NAME, :P_TYPE, :P_ADDRESS, :ADDRESS, :STREET, :SUBWRB, :POSTCODE, :STATE, :USER_ID, :USER_BY, :UPDATED_BY,
        :LOT, :DP, :INSURANCE_NO, :P_ENTATIVE_START_DATE, :P_TENTATIVE_END_DATE, :P_CODE,
        :DESCRIPTION, :FILE_PATH, 'PENDING', 1)
       RETURNING P_ID INTO :NEW_P_ID`,
      {
        P_NAME:                data.P_NAME ?? "",
        P_TYPE:                data.P_TYPE ?? null,
        P_ADDRESS:             data.P_ADDRESS ?? null,
        ADDRESS:               data.ADDRESS ?? null,
        STREET:                data.STREET ?? null,
        SUBWRB:                data.SUBWRB ?? null,
        POSTCODE:              data.POSTCODE ?? null,
        STATE:                 data.STATE ?? "NSW",
        USER_ID:               Number(data.USER_ID ?? 0),
        USER_BY:               Number(data.USER_BY ?? data.USER_ID ?? 0),
        UPDATED_BY:            Number(data.UPDATED_BY ?? data.USER_ID ?? 0),
        LOT:                   data.LOT ?? null,
        DP:                    data.DP ?? null,
        INSURANCE_NO:          data.INSURANCE_NO ?? null,
        P_ENTATIVE_START_DATE: data.P_ENTATIVE_START_DATE ? new Date(data.P_ENTATIVE_START_DATE) : null,
        P_TENTATIVE_END_DATE:  data.P_TENTATIVE_END_DATE  ? new Date(data.P_TENTATIVE_END_DATE)  : null,
        P_CODE:                data.P_CODE ?? null,
        DESCRIPTION:           data.DESCRIPTION ?? null,
        FILE_PATH:             null,
        NEW_P_ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const P_ID = result.outBinds.NEW_P_ID[0];

    // 2️⃣ FILE_PATH — logical reference (P_ID পাওয়ার পর)
    const filePath = `/pm/${P_ID}/`;
    await connection.execute(
      `UPDATE PM.PM_PROJECT SET FILE_PATH = :fp WHERE P_ID = :pid`,
      { fp: filePath, pid: P_ID },
      { autoCommit: false }
    );

    // 3️⃣ Contractor Types
    const contractorTypeIds = _parseIds(data.CONTRACTOR_TYPE_IDS);
    for (const ctId of contractorTypeIds) {
      await connection.execute(
        `INSERT INTO PM.PM_PROJECT_CONTRACTOR_TYPE (P_ID, CONTRACTOR_TYPE_ID)
         VALUES (:pid, :ctid)`,
        { pid: P_ID, ctid: Number(ctId) },
        { autoCommit: false }
      );
    }

    // 4️⃣ Mandatory files → BLOB insert
    for (const file of files) {
      await _insertMandatoryDoc(connection, {
        P_ID,
        FILE_NAME:   file.originalname,
        MIME_TYPE:   file.mimetype,
        FILE_SIZE:   file.size,
        FILE_BUFFER: file.buffer,
        CREATION_BY: Number(data.USER_ID ?? 0),
      });
    }

    // 5️⃣ Certificate placeholder rows — one per contractor type
    for (const ctId of contractorTypeIds) {
      await _insertCertPlaceholder(connection, {
        P_ID,
        CONTRACTOR_TYPE_ID: Number(ctId),
        CREATION_BY: Number(data.USER_ID ?? 0),
      });
    }

    await connection.commit();
    return P_ID;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// PROJECT SEARCH
// ─────────────────────────────────────────────
// export async function searchProject(p_id) {
//   const connection = await getConnection();
//   try {
// let sql = `
//   SELECT
//     P_ID, P_NAME, P_TYPE, P_ADDRESS, ADDRESS, STREET, SUBWRB, POSTCODE, STATE, USER_ID,
//     TO_CHAR(CREATION_DATE,         'YYYY-MM-DD HH24:MI:SS') AS CREATION_DATE,
//     TO_CHAR(UPDATE_DATE,           'YYYY-MM-DD HH24:MI:SS') AS UPDATE_DATE,
//     USER_BY, UPDATED_BY,
//     LOT, DP, INSURANCE_NO,
//     TO_CHAR(P_ENTATIVE_START_DATE, 'YYYY-MM-DD') AS P_ENTATIVE_START_DATE,
//     TO_CHAR(P_TENTATIVE_END_DATE,  'YYYY-MM-DD') AS P_TENTATIVE_END_DATE,
//     P_CODE, DESCRIPTION, FILE_PATH, CERT_UPLOAD_STATUS,
//     SORT_ORDER
//   FROM PM.PM_PROJECT`;

//     const binds = {};
//     if (p_id > 0) {
//       sql += " WHERE P_ID = :p_id_bv";
//       binds.p_id_bv = p_id;
//     }

//     const projResult = await connection.execute(sql, binds, {
//       outFormat: oracledb.OUT_FORMAT_OBJECT,
//     });
//     const projects = projResult.rows || [];

//     if (!projects.length) return projects;

//     if (p_id > 0) {
//       const proj = projects[0];

//       // Contractor types
//       const ctResult = await connection.execute(
//         `SELECT ID, CONTRACTOR_TYPE_ID,
//                 TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATION_DATE
//          FROM PM.PM_PROJECT_CONTRACTOR_TYPE
//          WHERE P_ID = :pid`,
//         { pid: p_id },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       proj.CONTRACTOR_TYPES = ctResult.rows || [];

//       // Docs — DOC_TYPE (BLOB) টাকে string এ convert করে return করো
//       // BLOB content (actual file binary) download route এ আলাদা দেওয়া হবে
//       const docResult = await connection.execute(
//         `SELECT ID, CONTRACTOR_TYPE_ID, FILE_NAME, FILE_PATH, MIME_TYPE, FILE_SIZE,
//                 UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(DOC_FILE, 20, 1)) AS DOC_FILE_LABEL,
//                 UPLOAD_STATUS,
//                 TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATION_DATE
//          FROM PM.PM_PROJECT_DOC
//          WHERE P_ID = :pid
//          ORDER BY UPLOAD_STATUS DESC, ID`,
//         { pid: p_id },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       proj.DOCS = docResult.rows || [];
//     }

//     return projects;
//   } finally {
//     await connection.close();
//   }
// }

// ─────────────────────────────────────────────
// PROJECT SEARCH
// ─────────────────────────────────────────────
export async function searchProject(p_id) {
  const connection = await getConnection();
  try {
    let sql = `
      SELECT
        P_ID, P_NAME, P_TYPE, P_ADDRESS, ADDRESS, STREET, SUBWRB, POSTCODE, STATE, USER_ID,
        TO_CHAR(CREATION_DATE,         'YYYY-MM-DD HH24:MI:SS') AS CREATION_DATE,
        TO_CHAR(UPDATE_DATE,           'YYYY-MM-DD HH24:MI:SS') AS UPDATE_DATE,
        USER_BY, UPDATED_BY,
        LOT, DP, INSURANCE_NO,
        TO_CHAR(P_ENTATIVE_START_DATE, 'YYYY-MM-DD') AS P_ENTATIVE_START_DATE,
        TO_CHAR(P_TENTATIVE_END_DATE,  'YYYY-MM-DD') AS P_TENTATIVE_END_DATE,
        P_CODE, DESCRIPTION, FILE_PATH, CERT_UPLOAD_STATUS,
        SORT_ORDER, PROJECT_STATUS, MARGIN_PERCENT
      FROM PM.PM_PROJECT`;

    const binds = {};
    if (p_id > 0) {
      sql += " WHERE P_ID = :p_id_bv";
      binds.p_id_bv = p_id;
    }

    sql += " ORDER BY SORT_ORDER";

    const projResult = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    const projects = projResult.rows || [];

    if (!projects.length) return projects;

    if (p_id > 0) {
      const proj = projects[0];

      const ctResult = await connection.execute(
        `SELECT ID, CONTRACTOR_TYPE_ID,
                TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATION_DATE
         FROM PM.PM_PROJECT_CONTRACTOR_TYPE
         WHERE P_ID = :pid`,
        { pid: p_id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      proj.CONTRACTOR_TYPES = ctResult.rows || [];

      const docResult = await connection.execute(
        `SELECT ID, CONTRACTOR_TYPE_ID, FILE_NAME, FILE_PATH, MIME_TYPE, FILE_SIZE,
                UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(DOC_FILE, 20, 1)) AS DOC_FILE_LABEL,
                UPLOAD_STATUS,
                TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATION_DATE
         FROM PM.PM_PROJECT_DOC
         WHERE P_ID = :pid
         ORDER BY UPLOAD_STATUS DESC, ID`,
        { pid: p_id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      proj.DOCS = docResult.rows || [];
    }

    return projects;
  } finally {
    await connection.close();
  }
}
// ─────────────────────────────────────────────
// FILE DOWNLOAD  (BLOB streaming)
// ─────────────────────────────────────────────
export async function getDocBlob(doc_id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT FILE_NAME, MIME_TYPE, FILE_SIZE, DOC_FILE AS FILE_BLOB
       FROM PM.PM_PROJECT_DOC
       WHERE ID = :id`,
      { id: Number(doc_id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows?.length) return null;
    const row = result.rows[0];

    // BLOB → Buffer
    let buffer = null;
    if (row.FILE_BLOB) {
      buffer = await _blobToBuffer(row.FILE_BLOB);
    }

    return {
      fileName: row.FILE_NAME,
      mimeType: row.MIME_TYPE,
      fileSize: row.FILE_SIZE,
      buffer,
    };
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// PROJECT UPDATE
// ─────────────────────────────────────────────
// export async function updateProject(data, files = []) {
//   const connection = await getConnection();
//   try {
//     const p_id = Number(data.P_ID || 0);
//     const set   = [];
//     const binds = {
//       p_id_bv:       p_id,
//       updated_by_bv: Number(data.UPDATED_BY),
//     };

//    const stringFields    = ["P_NAME", "P_TYPE", "P_ADDRESS", "ADDRESS", "STREET", "SUBWRB", "POSTCODE", "STATE"];
//     const numberFields    = ["USER_ID"];
//     const nullableStrings = ["LOT", "DP", "INSURANCE_NO", "P_CODE", "DESCRIPTION"];
//     const dateFields      = ["P_ENTATIVE_START_DATE", "P_TENTATIVE_END_DATE"];

//     for (const field of stringFields) {
//       if (Object.prototype.hasOwnProperty.call(data, field)) {
//         const key = field.toLowerCase();
//         set.push(`${field} = :${key}`);
//         binds[key] = data[field];
//       }
//     }
//     for (const field of numberFields) {
//       if (Object.prototype.hasOwnProperty.call(data, field)) {
//         const key = field.toLowerCase();
//         set.push(`${field} = :${key}`);
//         binds[key] = Number(data[field]);
//       }
//     }
//     for (const field of nullableStrings) {
//       if (Object.prototype.hasOwnProperty.call(data, field)) {
//         const key = field.toLowerCase();
//         set.push(`${field} = :${key}`);
//         binds[key] = data[field] ?? null;
//       }
//     }
//     for (const field of dateFields) {
//       if (Object.prototype.hasOwnProperty.call(data, field)) {
//         const key = field.toLowerCase();
//         set.push(`${field} = :${key}`);
//         binds[key] = data[field] ? new Date(data[field]) : null;
//       }
//     }

//     set.push("UPDATE_DATE = SYSDATE");
//     set.push("UPDATED_BY  = :updated_by_bv");

//     if (set.length <= 2) return 0;

//     const sql = `UPDATE PM.PM_PROJECT SET ${set.join(", ")} WHERE P_ID = :p_id_bv`;
//     const upResult = await connection.execute(sql, binds, { autoCommit: false });

//     // Contractor types পরিবর্তন হলে
//     if (Object.prototype.hasOwnProperty.call(data, "CONTRACTOR_TYPE_IDS")) {
//       const newIds = _parseIds(data.CONTRACTOR_TYPE_IDS);

//       await connection.execute(
//         `DELETE FROM PM.PM_PROJECT_CONTRACTOR_TYPE WHERE P_ID = :pid`,
//         { pid: p_id },
//         { autoCommit: false }
//       );
//       // পুরনো CERTIFICATE placeholder গুলো (file নেই এমন) মুছে দাও
//       await connection.execute(
//         `DELETE FROM PM.PM_PROJECT_DOC
//          WHERE P_ID = :pid AND UPLOAD_STATUS = 'PENDING'
//            AND UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(DOC_FILE, 11, 1)) = 'CERTIFICATE'`,
//         { pid: p_id },
//         { autoCommit: false }
//       );

//       for (const ctId of newIds) {
//         await connection.execute(
//           `INSERT INTO PM.PM_PROJECT_CONTRACTOR_TYPE (P_ID, CONTRACTOR_TYPE_ID)
//            VALUES (:pid, :ctid)`,
//           { pid: p_id, ctid: Number(ctId) },
//           { autoCommit: false }
//         );
//         await _insertCertPlaceholder(connection, {
//           P_ID: p_id,
//           CONTRACTOR_TYPE_ID: Number(ctId),
//           CREATION_BY: Number(data.UPDATED_BY),
//         });
//       }
//     }

//     // নতুন mandatory files
//     for (const file of files) {
//       await _insertMandatoryDoc(connection, {
//         P_ID:        p_id,
//         FILE_NAME:   file.originalname,
//         MIME_TYPE:   file.mimetype,
//         FILE_SIZE:   file.size,
//         FILE_BUFFER: file.buffer,
//         CREATION_BY: Number(data.UPDATED_BY),
//       });
//     }

//     await connection.commit();
//     return upResult.rowsAffected;
//   } catch (err) {
//     await connection.rollback();
//     throw err;
//   } finally {
//     await connection.close();
//   }
// }
// ─────────────────────────────────────────────
// PROJECT UPDATE
// ─────────────────────────────────────────────
export async function updateProject(data, files = []) {
  const connection = await getConnection();
  try {
    const p_id = Number(data.P_ID || 0);
    const set   = [];
    const binds = {
      p_id_bv:       p_id,
      updated_by_bv: Number(data.UPDATED_BY),
    };

   const stringFields    = ["P_NAME", "P_TYPE", "P_ADDRESS", "ADDRESS", "STREET", "SUBWRB", "POSTCODE", "STATE", "PROJECT_STATUS"];
    const numberFields    = ["USER_ID"];
    const nullableStrings = ["LOT", "DP", "INSURANCE_NO", "P_CODE", "DESCRIPTION"];
    const dateFields      = ["P_ENTATIVE_START_DATE", "P_TENTATIVE_END_DATE"];

    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        const key = field.toLowerCase();
        set.push(`${field} = :${key}`);
        binds[key] = data[field];
      }
    }
    for (const field of numberFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        const key = field.toLowerCase();
        set.push(`${field} = :${key}`);
        binds[key] = Number(data[field]);
      }
    }
    for (const field of nullableStrings) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        const key = field.toLowerCase();
        set.push(`${field} = :${key}`);
        binds[key] = data[field] ?? null;
      }
    }
    for (const field of dateFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        const key = field.toLowerCase();
        set.push(`${field} = :${key}`);
        binds[key] = data[field] ? new Date(data[field]) : null;
      }
    }

    set.push("UPDATE_DATE = SYSDATE");
    set.push("UPDATED_BY  = :updated_by_bv");

    if (set.length <= 2) return 0;

    const sql = `UPDATE PM.PM_PROJECT SET ${set.join(", ")} WHERE P_ID = :p_id_bv`;
    const upResult = await connection.execute(sql, binds, { autoCommit: false });

    // Contractor types পরিবর্তন হলে
    if (Object.prototype.hasOwnProperty.call(data, "CONTRACTOR_TYPE_IDS")) {
      const newIds = _parseIds(data.CONTRACTOR_TYPE_IDS);

      await connection.execute(
        `DELETE FROM PM.PM_PROJECT_CONTRACTOR_TYPE WHERE P_ID = :pid`,
        { pid: p_id },
        { autoCommit: false }
      );
      // পুরনো CERTIFICATE placeholder গুলো (file নেই এমন) মুছে দাও
      await connection.execute(
        `DELETE FROM PM.PM_PROJECT_DOC
         WHERE P_ID = :pid AND UPLOAD_STATUS = 'PENDING'
           AND UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(DOC_FILE, 11, 1)) = 'CERTIFICATE'`,
        { pid: p_id },
        { autoCommit: false }
      );

      for (const ctId of newIds) {
        await connection.execute(
          `INSERT INTO PM.PM_PROJECT_CONTRACTOR_TYPE (P_ID, CONTRACTOR_TYPE_ID)
           VALUES (:pid, :ctid)`,
          { pid: p_id, ctid: Number(ctId) },
          { autoCommit: false }
        );
        await _insertCertPlaceholder(connection, {
          P_ID: p_id,
          CONTRACTOR_TYPE_ID: Number(ctId),
          CREATION_BY: Number(data.UPDATED_BY),
        });
      }
    }

    // নতুন mandatory files
    for (const file of files) {
      await _insertMandatoryDoc(connection, {
        P_ID:        p_id,
        FILE_NAME:   file.originalname,
        MIME_TYPE:   file.mimetype,
        FILE_SIZE:   file.size,
        FILE_BUFFER: file.buffer,
        CREATION_BY: Number(data.UPDATED_BY),
      });
    }

    await connection.commit();
    return upResult.rowsAffected;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}


// ─────────────────────────────────────────────
// QUICK STATUS UPDATE (Lightweight)
// ─────────────────────────────────────────────
export async function updateProjectStatus(p_id, status, updated_by) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `UPDATE PM.PM_PROJECT 
       SET PROJECT_STATUS = :status, 
           UPDATE_DATE = SYSDATE, 
           UPDATED_BY = :updated_by 
       WHERE P_ID = :p_id`,
      {
        status:      status,
        updated_by:  Number(updated_by || 0),
        p_id:        Number(p_id),
      },
      { autoCommit: true } // Simple update, autoCommit is perfectly fine here
    );
    return result.rowsAffected;
  } catch (err) {
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// QUICK MARGIN UPDATE (Lightweight)
// ─────────────────────────────────────────────
export async function updateProjectMargin(p_id, margin, updated_by) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `UPDATE PM.PM_PROJECT 
       SET MARGIN_PERCENT = :margin, 
           UPDATE_DATE = SYSDATE, 
           UPDATED_BY = :updated_by 
       WHERE P_ID = :p_id`,
      {
        margin:      margin,
        updated_by:  Number(updated_by || 0),
        p_id:        Number(p_id),
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } catch (err) {
    throw err;
  } finally {
    await connection.close();
  }
}
// ─────────────────────────────────────────────
// PROJECT DELETE
// ─────────────────────────────────────────────
// export async function deleteProject(p_id) {
//   const connection = await getConnection();
//   try {
//     await connection.execute(
//       `DELETE FROM PM.PM_PROJECT_CONTRACTOR_TYPE WHERE P_ID = :pid`,
//       { pid: Number(p_id) },
//       { autoCommit: false }
//     );
//     await connection.execute(
//       `DELETE FROM PM.PM_PROJECT_DOC WHERE P_ID = :pid`,
//       { pid: Number(p_id) },
//       { autoCommit: false }
//     );
//     const result = await connection.execute(
//       `DELETE FROM PM.PM_PROJECT WHERE P_ID = :pid`,
//       { pid: Number(p_id) },
//       { autoCommit: false }
//     );
//     await connection.commit();
//     return result.rowsAffected;
//   } catch (err) {
//     await connection.rollback();
//     throw err;
//   } finally {
//     await connection.close();
//   }
// }
export async function deleteProject(p_id) {
  const connection = await getConnection();
  try {
    const id = Number(p_id);

    // 0️⃣ Get the SORT_ORDER of the row about to be deleted
    const current = await connection.execute(
      `SELECT SORT_ORDER FROM PM.PM_PROJECT WHERE P_ID = :pid`,
      { pid: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const deletedPosition = current.rows?.[0]?.SORT_ORDER ?? null;

    await connection.execute(
      `DELETE FROM PM.PM_PROJECT_CONTRACTOR_TYPE WHERE P_ID = :pid`,
      { pid: id },
      { autoCommit: false }
    );
    await connection.execute(
      `DELETE FROM PM.PM_PROJECT_DOC WHERE P_ID = :pid`,
      { pid: id },
      { autoCommit: false }
    );
    const result = await connection.execute(
      `DELETE FROM PM.PM_PROJECT WHERE P_ID = :pid`,
      { pid: id },
      { autoCommit: false }
    );

    // 1️⃣ Close the gap: shift every row below the deleted one up by one
    if (deletedPosition != null) {
      await connection.execute(
        `UPDATE PM.PM_PROJECT
            SET SORT_ORDER = SORT_ORDER - 1
          WHERE SORT_ORDER > :deletedPosition`,
        { deletedPosition },
        { autoCommit: false }
      );
    }

    await connection.commit();
    return result.rowsAffected;
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

/**
 * Mandatory file → DOC_TYPE BLOB তে file content ("MANDATORY" label + binary)
 * Oracle BLOB এ string label store করতে হলে UTL_RAW ব্যবহার করতে হয়।
 * তবে এখানে DOC_TYPE BLOB column এ আমরা actual file binary store করছি
 * এবং DOC_TYPE label টা আলাদাভাবে UPLOAD_STATUS দিয়ে distinguish করছি।
 *
 * Schema: DOC_TYPE BLOB = actual file binary content
 *         UPLOAD_STATUS  = 'UPLOADED' | 'PENDING'
 *         FILE_NAME, MIME_TYPE, FILE_SIZE = metadata
 */
async function _insertMandatoryDoc(connection, doc) {
  // Step 1: empty BLOB row insert করো, RETURNING BLOB locator নাও
  const insertResult = await connection.execute(
    `INSERT INTO PM.PM_PROJECT_DOC
     (P_ID, CONTRACTOR_TYPE_ID, FILE_NAME, MIME_TYPE, FILE_SIZE,
      DOC_FILE, UPLOAD_STATUS, CREATION_BY)
     VALUES
     (:pid, NULL, :fname, :mime, :fsize,
      EMPTY_BLOB(), 'UPLOADED', :cby)
     RETURNING DOC_FILE INTO :blob_out`,
    {
      pid:      doc.P_ID,
      fname:    doc.FILE_NAME,
      mime:     doc.MIME_TYPE,
      fsize:    doc.FILE_SIZE,
      cby:      doc.CREATION_BY ?? 0,
      blob_out: { dir: oracledb.BIND_OUT, type: oracledb.BLOB },
    },
    { autoCommit: false }
  );

  // Step 2: BLOB locator এ file buffer লিখে দাও
  const blobLob = insertResult.outBinds.blob_out[0];
  await _writeBufferToBlob(blobLob, doc.FILE_BUFFER);
}

async function _insertCertPlaceholder(connection, doc) {
  // Certificate placeholder — DOC_TYPE BLOB তে 'CERTIFICATE' string store
  const labelBuffer = Buffer.from("CERTIFICATE");
  const insertResult = await connection.execute(
    `INSERT INTO PM.PM_PROJECT_DOC

     (P_ID, CONTRACTOR_TYPE_ID, FILE_NAME, MIME_TYPE, FILE_SIZE,
      DOC_FILE, UPLOAD_STATUS, CREATION_BY)
     VALUES
     (:pid, :ctid, NULL, NULL, NULL,
      EMPTY_BLOB(), 'PENDING', :cby)
     RETURNING DOC_FILE INTO :blob_out`,
    {
      pid:      doc.P_ID,
      ctid:     doc.CONTRACTOR_TYPE_ID,
      cby:      doc.CREATION_BY ?? 0,
      blob_out: { dir: oracledb.BIND_OUT, type: oracledb.BLOB },
    },
    { autoCommit: false }
  );

  const blobLob = insertResult.outBinds.blob_out[0];
  await _writeBufferToBlob(blobLob, labelBuffer);
}

// Buffer → Oracle LOB stream write
function _writeBufferToBlob(lob, buffer) {
  return new Promise((resolve, reject) => {
    lob.on("error", reject);
    lob.on("finish", resolve);
    lob.write(buffer);
    lob.end();
  });
}

// Oracle LOB → Buffer (download এর জন্য)
function _blobToBuffer(lob) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    lob.on("data",  (chunk) => chunks.push(chunk));
    lob.on("end",   () => resolve(Buffer.concat(chunks)));
    lob.on("error", reject);
  });
}

function _parseIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number).filter(Boolean);
  if (typeof value === "string") {
    try { return JSON.parse(value).map(Number).filter(Boolean); } catch {
      return value.split(",").map(Number).filter(Boolean);
    }
  }
  return [];
}


// ─────────────────────────────────────────────
// service.js এ এই ফাংশনটা যুক্ত করুন (export করে)
// বিদ্যমান _writeBufferToBlob হেল্পার ব্যবহার করে — নতুন কিছু লাগবে না
// ─────────────────────────────────────────────

/**
 * Certificate upload — একটা EXISTING PENDING row (CONTRACTOR_TYPE_ID থাকা,
 * DOC_FILE = 'CERTIFICATE' label) কে actual file দিয়ে update করে।
 * _insertMandatoryDoc এর মতো নতুন row insert করে না, বরং in-place update করে।
 *
 * @param {number} doc_id      - PM_PROJECT_DOC.ID (যেই PENDING row আপডেট হবে)
 * @param {object} file        - multer file object { originalname, mimetype, size, buffer }
 * @param {number} updated_by  - USER_ID যিনি আপলোড করছেন
 * @returns {object|null}      - { P_ID, ID } আপডেট সফল হলে, না হলে null
 */
export async function uploadCertificateDoc(doc_id, file, updated_by) {
  const connection = await getConnection();
  try {
    // 1️⃣ নিশ্চিত করো এই row টা আসলেই একটা PENDING certificate placeholder
    //    (CONTRACTOR_TYPE_ID থাকা মানেই certificate, mandatory doc এ এটা NULL)
    const checkResult = await connection.execute(
      `SELECT ID, P_ID, CONTRACTOR_TYPE_ID, UPLOAD_STATUS
       FROM PM.PM_PROJECT_DOC
       WHERE ID = :id`,
      { id: Number(doc_id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row = checkResult.rows?.[0];
    if (!row) return null;                          // doc id ই নেই
    if (row.CONTRACTOR_TYPE_ID == null) return null; // এটা mandatory doc, certificate না
    if (row.UPLOAD_STATUS === "UPLOADED") return null; // আগেই আপলোড হয়ে গেছে, re-upload রোধ

    // 2️⃣ ফাঁকা BLOB এ পয়েন্টার নিয়ে মেটাডেটা + স্ট্যাটাস একসাথে আপডেট করো
    const updateResult = await connection.execute(
      `UPDATE PM.PM_PROJECT_DOC
       SET FILE_NAME     = :fname,
           MIME_TYPE      = :mime,
           FILE_SIZE      = :fsize,
           DOC_FILE       = EMPTY_BLOB(),
           UPLOAD_STATUS  = 'UPLOADED',
           CREATION_BY    = :cby
       WHERE ID = :id
       RETURNING DOC_FILE INTO :blob_out`,
      {
        id:       Number(doc_id),
        fname:    file.originalname,
        mime:     file.mimetype,
        fsize:    file.size,
        cby:      Number(updated_by ?? 0),
        blob_out: { dir: oracledb.BIND_OUT, type: oracledb.BLOB },
      },
      { autoCommit: false }
    );

    // 3️⃣ BLOB locator এ actual file বাফার লিখে দাও
    const blobLob = updateResult.outBinds.blob_out[0];
    await _writeBufferToBlob(blobLob, file.buffer);

    await connection.commit();
    return { P_ID: row.P_ID, ID: row.ID };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// export async function sendBulkEmailToContractors({ CONTRACTOR_IDS, SUBJECT, MESSAGE, P_ID }) {
//   const ids = (CONTRACTOR_IDS || []).map(Number).filter(Boolean);
//   if (!ids.length) return { sent: 0, failed: 0, total: 0 };

//   const connection = await getConnection();
//   try {
//     const placeholders = ids.map((_, i) => `:id${i}`).join(",");
//     const binds = {};
//     ids.forEach((id, i) => (binds[`id${i}`] = id));

//     const result = await connection.execute(
//       `SELECT CONTRATOR_ID, CONTRATOR_NAME, EMAIL
//        FROM PM.PM_CONTRACTOR_INFO
//        WHERE CONTRATOR_ID IN (${placeholders}) AND EMAIL IS NOT NULL`,
//       binds,
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const contractors = result.rows || [];
//     if (!contractors.length) return { sent: 0, failed: 0, total: 0 };

//     let project = null;
//     if (P_ID) {
//       const projRes = await connection.execute(
//         `SELECT P_NAME, P_ADDRESS FROM PM.PM_PROJECT WHERE P_ID = :pid`,
//         { pid: Number(P_ID) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
//       project = projRes.rows?.[0] || null;
//     }

//     const results = await Promise.allSettled(
//       contractors.map((c) =>
//         sendMail({
//           to: c.EMAIL,
//           subject: SUBJECT,
//           html: bulkContractorTemplate({
//             contractorName: c.CONTRATOR_NAME,
//             message: MESSAGE,
//             projectName: project?.P_NAME,
//             projectAddress: project?.P_ADDRESS,
//           }),
//         })
//       )
//     );

//     const sent = results.filter((r) => r.status === "fulfilled").length;
//     return { sent, failed: results.length - sent, total: contractors.length };
//   } finally {
//     await connection.close();
//   }
// }

export async function sendBulkEmailToContractors({ CONTRACTOR_IDS, SUBJECT, MESSAGE, P_ID }) {
  const ids = (CONTRACTOR_IDS || []).map(Number).filter(Boolean);
  console.log("🔍 [service] Parsed contractor IDs:", ids);

  if (!ids.length) return { sent: 0, failed: 0, total: 0 };

  const connection = await getConnection();
  try {
    const placeholders = ids.map((_, i) => `:id${i}`).join(",");
    const binds = {};
    ids.forEach((id, i) => (binds[`id${i}`] = id));

    const result = await connection.execute(
      `SELECT CONTRATOR_ID, CONTRATOR_NAME, EMAIL
       FROM PM.PM_CONTRACTOR_INFO
       WHERE CONTRATOR_ID IN (${placeholders}) AND EMAIL IS NOT NULL`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const contractors = result.rows || [];

    console.log(`📋 [service] Found ${contractors.length} contractor(s) with email:`);
    contractors.forEach((c) =>
      console.log(`   → ID: ${c.CONTRATOR_ID} | Name: ${c.CONTRATOR_NAME} | Email: ${c.EMAIL}`)
    );

    if (!contractors.length) {
      console.log("⚠️ [service] No contractors matched IDs or none have EMAIL set");
      return { sent: 0, failed: 0, total: 0 };
    }

    let project = null;
    if (P_ID) {
      const projRes = await connection.execute(
        `SELECT P_NAME, P_ADDRESS FROM PM.PM_PROJECT WHERE P_ID = :pid`,
        { pid: Number(P_ID) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      project = projRes.rows?.[0] || null;
    }

    const results = await Promise.allSettled(
      contractors.map((c) =>
        sendMail({
          to: c.EMAIL,
          subject: SUBJECT,
          html: bulkContractorTemplate({
            contractorName: c.CONTRATOR_NAME,
            message: MESSAGE,
            projectName: project?.P_NAME,
            projectAddress: project?.P_ADDRESS,
          }),
        })
      )
    );

    console.log("───── 📬 Per-Email Result ─────");
    results.forEach((r, i) => {
      const c = contractors[i];
      if (r.status === "fulfilled") {
        console.log(`✅ SENT   → ${c.EMAIL} (${c.CONTRATOR_NAME}) | messageId: ${r.value?.messageId}`);
      } else {
        console.log(`❌ FAILED → ${c.EMAIL} (${c.CONTRATOR_NAME}) | reason: ${r.reason?.message}`);
      }
    });
    console.log("───────────────────────────────");

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return { sent, failed: results.length - sent, total: contractors.length };
  } finally {
    await connection.close();
  }
}




// ─────────────────────────────────────────────
// REORDER: shift SORT_ORDER for a project to a new position
// ─────────────────────────────────────────────
async function reorderProjectQuery(connection, p_id, newPosition) {
  const current = await connection.execute(
    `SELECT SORT_ORDER FROM PM.PM_PROJECT WHERE P_ID = :id`,
    { id: Number(p_id) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (!current.rows.length) {
    throw new Error(`Project ${p_id} not found`);
  }

  const oldPosition = current.rows[0].SORT_ORDER;

  const countResult = await connection.execute(
    `SELECT COUNT(*) AS TOTAL FROM PM.PM_PROJECT`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const totalCount = countResult.rows[0].TOTAL;

  let target = Number(newPosition);
  if (target < 1) target = 1;
  if (target > totalCount) target = totalCount;

  if (target === oldPosition) {
    return { p_id, oldPosition, newPosition: target, moved: false };
  }

  // Park the moved row on a safe, non-colliding temp value first
  await connection.execute(
    `UPDATE PM.PM_PROJECT SET SORT_ORDER = -1 WHERE P_ID = :id`,
    { id: Number(p_id) },
    { autoCommit: false }
  );

  if (target < oldPosition) {
    await connection.execute(
      `UPDATE PM.PM_PROJECT
          SET SORT_ORDER = SORT_ORDER + 1
        WHERE SORT_ORDER >= :target AND SORT_ORDER < :oldPosition`,
      { target, oldPosition },
      { autoCommit: false }
    );
  } else {
    await connection.execute(
      `UPDATE PM.PM_PROJECT
          SET SORT_ORDER = SORT_ORDER - 1
        WHERE SORT_ORDER > :oldPosition AND SORT_ORDER <= :target`,
      { target, oldPosition },
      { autoCommit: false }
    );
  }

  await connection.execute(
    `UPDATE PM.PM_PROJECT SET SORT_ORDER = :target WHERE P_ID = :id`,
    { target, id: Number(p_id) },
    { autoCommit: false }
  );

  return { p_id, oldPosition, newPosition: target, moved: true };
}

// ── EXPORTED: reorder a project to an explicit position (used by input box) ─
export async function reorderProject(p_id, newPosition) {
  const connection = await getConnection();
  try {
    const result = await reorderProjectQuery(connection, p_id, newPosition);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ── EXPORTED: move up/down by one position (used by arrow buttons) ───────────
export async function moveProject(p_id, direction) {
  const connection = await getConnection();
  try {
    const current = await connection.execute(
      `SELECT SORT_ORDER FROM PM.PM_PROJECT WHERE P_ID = :id`,
      { id: Number(p_id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!current.rows.length) {
      throw new Error(`Project ${p_id} not found`);
    }

    const oldPosition = current.rows[0].SORT_ORDER;
    const target = direction === "up" ? oldPosition - 1 : oldPosition + 1;

    const result = await reorderProjectQuery(connection, p_id, target);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}