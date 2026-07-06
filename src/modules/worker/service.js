// src/modules/worker/service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ─────────────────────────────────────────────
// WORKER INSERT
// ─────────────────────────────────────────────
export async function insertWorker(data) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `INSERT INTO PM.PM_WORKER
       (WORKER_NAME, PHONE, ADDRESS, STATUS, REMARKS, CREATED_BY, UPDATED_BY)
       VALUES
       (:WORKER_NAME, :PHONE, :ADDRESS, :STATUS, :REMARKS, :CREATED_BY, :UPDATED_BY)
       RETURNING WORKER_ID INTO :NEW_WORKER_ID`,
      {
        WORKER_NAME:   data.WORKER_NAME,
        PHONE:         data.PHONE ?? null,
        ADDRESS:       data.ADDRESS ?? null,
        STATUS:        Number(data.STATUS ?? 1),
        REMARKS:       data.REMARKS ?? null,
        CREATED_BY:    data.CREATED_BY ?? null,
        UPDATED_BY:    data.UPDATED_BY ?? data.CREATED_BY ?? null,
        NEW_WORKER_ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const WORKER_ID = result.outBinds.NEW_WORKER_ID[0];
    await connection.commit();
    return WORKER_ID;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// WORKER SEARCH
// ─────────────────────────────────────────────
export async function searchWorker(worker_id) {
  const connection = await getConnection();
  try {
    let sql = `
      SELECT
        WORKER_ID, WORKER_NAME, PHONE, ADDRESS, STATUS, REMARKS,
        CREATED_BY,
        TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE,
        UPDATED_BY,
        TO_CHAR(UPDATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_DATE
      FROM PM.PM_WORKER`;

    const binds = {};
    if (worker_id > 0) {
      sql += " WHERE WORKER_ID = :worker_id_bv";
      binds.worker_id_bv = worker_id;
    }

    sql += " ORDER BY WORKER_ID";

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// WORKER UPDATE
// ─────────────────────────────────────────────
export async function updateWorker(data) {
  const connection = await getConnection();
  try {
    const worker_id = Number(data.WORKER_ID || 0);
    const set = [];
    const binds = {
      worker_id_bv:  worker_id,
      updated_by_bv: data.UPDATED_BY ?? null,
    };

    const stringFields = ["WORKER_NAME", "PHONE", "ADDRESS", "REMARKS"];
    const numberFields = ["STATUS"];

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

    set.push("UPDATED_DATE = SYSDATE");
    set.push("UPDATED_BY   = :updated_by_bv");

    if (set.length <= 2) return 0;

    const sql = `UPDATE PM.PM_WORKER SET ${set.join(", ")} WHERE WORKER_ID = :worker_id_bv`;
    const upResult = await connection.execute(sql, binds, { autoCommit: false });

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
// WORKER DELETE
// ─────────────────────────────────────────────
export async function deleteWorker(worker_id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `DELETE FROM PM.PM_WORKER WHERE WORKER_ID = :worker_id`,
      { worker_id: Number(worker_id) },
      { autoCommit: false }
    );
    await connection.commit();
    return result.rowsAffected;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}