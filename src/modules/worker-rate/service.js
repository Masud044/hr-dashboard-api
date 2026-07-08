// src/modules/worker-rate/service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ─────────────────────────────────────────────
// SET NEW WORKER RATE (Close old, Insert new)
// ─────────────────────────────────────────────
export async function setWorkerRate(data) {
  const connection = await getConnection();
  try {
    const workerId = Number(data.WORKER_ID);
    const effFrom = new Date(data.EFFECTIVE_FROM);
    const rateHour = data.RATE_PER_HOUR != null ? Number(data.RATE_PER_HOUR) : null;
    const rateDay = data.RATE_PER_DAY != null ? Number(data.RATE_PER_DAY) : null;

    // // 1️⃣ Find the worker's current open rate (EFFECTIVE_TO IS NULL)
    // const openRateRes = await connection.execute(
    //   `SELECT RATE_ID 
    //    FROM PM.PM_WORKER_RATE_HISTORY 
    //    WHERE WORKER_ID = :wid AND EFFECTIVE_TO IS NULL`,
    //   { wid: workerId },
    //   { outFormat: oracledb.OUT_FORMAT_OBJECT }
    // );

    // // 2️⃣ If an open rate exists, close it by setting EFFECTIVE_TO to (new start date - 1 day)
    // if (openRateRes.rows?.length > 0) {
    //   const oldRateId = openRateRes.rows[0].RATE_ID;
    //   await connection.execute(
    //     `UPDATE PM.PM_WORKER_RATE_HISTORY 
    //      SET EFFECTIVE_TO = :eff_from - 1 
    //      WHERE RATE_ID = :rid`,
    //     { eff_from: effFrom, rid: oldRateId },
    //     { autoCommit: false }
    //   );
    // }

    // 1️⃣ Find the worker's current open rate
const openRateRes = await connection.execute(
  `SELECT RATE_ID, EFFECTIVE_FROM
   FROM PM.PM_WORKER_RATE_HISTORY 
   WHERE WORKER_ID = :wid AND EFFECTIVE_TO IS NULL`,
  { wid: workerId },
  { outFormat: oracledb.OUT_FORMAT_OBJECT }
);

if (openRateRes.rows?.length > 0) {
  const oldRate = openRateRes.rows[0];

  // 🚫 block backdating before/on the current open rate's start
  if (effFrom <= new Date(oldRate.EFFECTIVE_FROM)) {
    const err = new Error(
      `New effective date must be after ${oldRate.EFFECTIVE_FROM.toISOString().split("T")[0]} (current rate's start date).`
    );
    err.statusCode = 400;
    throw err;
  }

  await connection.execute(
    `UPDATE PM.PM_WORKER_RATE_HISTORY 
     SET EFFECTIVE_TO = :eff_from - 1 
     WHERE RATE_ID = :rid`,
    { eff_from: effFrom, rid: oldRate.RATE_ID },
    { autoCommit: false }
  );
}

    // 3️⃣ Insert the new open-ended rate row
    const insertRes = await connection.execute(
      `INSERT INTO PM.PM_WORKER_RATE_HISTORY 
       (WORKER_ID, EFFECTIVE_FROM, EFFECTIVE_TO, RATE_PER_HOUR, RATE_PER_DAY, REMARKS, CREATED_BY)
       VALUES 
       (:wid, :eff_from, NULL, :r_hour, :r_day, :remarks, :cby)
       RETURNING RATE_ID INTO :new_rid`,
      {
        wid:     workerId,
        eff_from: effFrom,
        r_hour:  rateHour,
        r_day:   rateDay,
        remarks: data.REMARKS ?? null,
        cby:     data.CREATED_BY ?? null,
        new_rid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const newRateId = insertRes.outBinds.new_rid[0];
    
    await connection.commit();
    return newRateId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}


// ─────────────────────────────────────────────
// DELETE CURRENT (OPEN) WORKER RATE
// Reopens the previous rate row, if one exists
// ─────────────────────────────────────────────
export async function deleteCurrentWorkerRate(worker_id) {
  const connection = await getConnection();
  try {
    const workerId = Number(worker_id);

    // 1️⃣ Find the current open rate row
    const openRateRes = await connection.execute(
      `SELECT RATE_ID 
       FROM PM.PM_WORKER_RATE_HISTORY 
       WHERE WORKER_ID = :wid AND EFFECTIVE_TO IS NULL`,
      { wid: workerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!openRateRes.rows?.length) {
      const err = new Error(`No current active rate found for worker ID ${workerId}.`);
      err.statusCode = 404;
      throw err;
    }

    const openRateId = openRateRes.rows[0].RATE_ID;

    // 2️⃣ Delete the open row
    await connection.execute(
      `DELETE FROM PM.PM_WORKER_RATE_HISTORY WHERE RATE_ID = :rid`,
      { rid: openRateId },
      { autoCommit: false }
    );

    // 3️⃣ Find the previous row (latest EFFECTIVE_TO) for this worker, if any
    const prevRateRes = await connection.execute(
      `SELECT RATE_ID
       FROM PM.PM_WORKER_RATE_HISTORY
       WHERE WORKER_ID = :wid AND EFFECTIVE_TO IS NOT NULL
       ORDER BY EFFECTIVE_TO DESC
       FETCH FIRST 1 ROW ONLY`,
      { wid: workerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    let reopenedRateId = null;

    // 4️⃣ Reopen it, if it exists
    if (prevRateRes.rows?.length > 0) {
      reopenedRateId = prevRateRes.rows[0].RATE_ID;
      await connection.execute(
        `UPDATE PM.PM_WORKER_RATE_HISTORY 
         SET EFFECTIVE_TO = NULL 
         WHERE RATE_ID = :rid`,
        { rid: reopenedRateId },
        { autoCommit: false }
      );
    }

    await connection.commit();
    return { deletedRateId: openRateId, reopenedRateId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// GET WORKER RATE HISTORY
// ─────────────────────────────────────────────
export async function getWorkerRateHistory(worker_id) {
  const connection = await getConnection();
  try {
    const sql = `
      SELECT 
        RATE_ID, WORKER_ID, 
        TO_CHAR(EFFECTIVE_FROM, 'YYYY-MM-DD') AS EFFECTIVE_FROM,
        TO_CHAR(EFFECTIVE_TO, 'YYYY-MM-DD') AS EFFECTIVE_TO,
        RATE_PER_HOUR, RATE_PER_DAY, REMARKS, CREATED_BY,
        TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE
      FROM PM.PM_WORKER_RATE_HISTORY
      WHERE WORKER_ID = :wid
      ORDER BY EFFECTIVE_FROM DESC`;

    const result = await connection.execute(
      sql, 
      { wid: Number(worker_id) }, 
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// GET CURRENT WORKER RATE
// ─────────────────────────────────────────────
export async function getCurrentWorkerRate(worker_id) {
  const connection = await getConnection();
  try {
    const sql = `
      SELECT 
        RATE_ID, WORKER_ID, 
        TO_CHAR(EFFECTIVE_FROM, 'YYYY-MM-DD') AS EFFECTIVE_FROM,
        RATE_PER_HOUR, RATE_PER_DAY, REMARKS, CREATED_BY,
        TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE
      FROM PM.PM_WORKER_RATE_HISTORY
      WHERE WORKER_ID = :wid AND EFFECTIVE_TO IS NULL`;

    const result = await connection.execute(
      sql, 
      { wid: Number(worker_id) }, 
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows?.[0] || null;
  } finally {
    await connection.close();
  }
}