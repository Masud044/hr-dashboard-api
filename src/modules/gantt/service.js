import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ✅ FIXED JOIN:
//   PM_SCHEDUL_L.H_ID  -> PM_SCHEDUL_H.H_ID  -> PM_SCHEDUL_H.P_ID
//   PM_CONSTRUCTION_PROCESS.PROCESS_ID = PM_SCHEDUL_H.P_ID  (project ID)
//   PM_CONSTRUCTION_PROCESS.SUB_CONTRACT_ID = PM_SCHEDUL_L.C_P_ID (contractor type)
export async function listGantt({ h_id, l_id }) {
  const connection = await getConnection();
  try {
    let sql = `
      SELECT
        L.L_ID,
        L.H_ID,
        L.C_P_ID,
        L.DESCRIPTION,
        TO_CHAR(L.SCHEDULE_START_DATE, 'YYYY-MM-DD') AS SCHEDULE_START_DATE,
        TO_CHAR(L.SCHEDULE_END_DATE,   'YYYY-MM-DD') AS SCHEDULE_END_DATE,
        TO_CHAR(L.CREATION_DATE,       'YYYY-MM-DD') AS CREATION_DATE,
        TO_CHAR(L.UPDATED_DATE,        'YYYY-MM-DD') AS UPDATED_DATE,
        L.CREATION_BY,
        L.UPDATED_BY,
        CP.CONTRACTOR_ID,
        CI.CONTRATOR_NAME
      FROM PM_SCHEDUL_L L
      JOIN PM_SCHEDUL_H H
        ON H.H_ID = L.H_ID
      LEFT JOIN PM_CONSTRUCTION_PROCESS CP
        ON  CP.PROCESS_ID      = H.P_ID
        AND CP.SUB_CONTRACT_ID = L.C_P_ID
      LEFT JOIN PM_CONTRACTOR_INFO CI
        ON  CI.CONTRATOR_ID    = CP.CONTRACTOR_ID
    `;

    const conditions = [];
    const binds = {};

    if (h_id) {
      conditions.push("L.H_ID = :h_id");
      binds.h_id = h_id;
    }
    if (l_id) {
      conditions.push("L.L_ID = :l_id");
      binds.l_id = l_id;
    }
    if (conditions.length) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += " ORDER BY L.L_ID";

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function createGantt(payload) {
  const connection = await getConnection();
  try {
    let newId;
    try {
      const seqResult = await connection.execute(
        "SELECT PM_SCHEDUL_L_SEQ.NEXTVAL AS N FROM DUAL",
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      newId = seqResult.rows?.[0]?.N;
    } catch (error) {
      const fallback = await connection.execute(
        "SELECT NVL(MAX(L_ID),0)+1 AS N FROM PM_SCHEDUL_L",
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      newId = fallback.rows?.[0]?.N;
    }

    const result = await connection.execute(
      `INSERT INTO PM_SCHEDUL_L
       (L_ID, H_ID, C_P_ID, DESCRIPTION, SCHEDULE_START_DATE, SCHEDULE_END_DATE,
        CREATION_DATE, UPDATED_DATE, CREATION_BY)
       VALUES
       (:L_ID, :H_ID, :C_P_ID, :DESCRIPTION,
        TO_DATE(:S_START,'YYYY-MM-DD'), TO_DATE(:S_END,'YYYY-MM-DD'),
        SYSDATE, SYSDATE, :CREATION_BY)`,
      {
        L_ID:        newId,
        H_ID:        payload.H_ID,
        C_P_ID:      payload.C_P_ID,
        DESCRIPTION: payload.DESCRIPTION ?? null,
        S_START:     payload.SCHEDULE_START_DATE,
        S_END:       payload.SCHEDULE_END_DATE,
        CREATION_BY: payload.CREATION_BY ?? null,
      },
      { autoCommit: true }
    );

    return { success: result.rowsAffected > 0, message: "Inserted", L_ID: newId };
  } finally {
    await connection.close();
  }
}

export async function updateGantt(payload) {
  const connection = await getConnection();
  try {
    const fields = [];
    const binds = { L_ID: payload.L_ID };

    if (Object.prototype.hasOwnProperty.call(payload, "H_ID")) {
      fields.push("H_ID = :H_ID");
      binds.H_ID = payload.H_ID;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "C_P_ID")) {
      fields.push("C_P_ID = :C_P_ID");
      binds.C_P_ID = payload.C_P_ID;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "DESCRIPTION")) {
      fields.push("DESCRIPTION = :DESCRIPTION");
      binds.DESCRIPTION = payload.DESCRIPTION;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "SCHEDULE_START_DATE")) {
      fields.push("SCHEDULE_START_DATE = TO_DATE(:S_START,'YYYY-MM-DD')");
      binds.S_START = payload.SCHEDULE_START_DATE;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "SCHEDULE_END_DATE")) {
      fields.push("SCHEDULE_END_DATE = TO_DATE(:S_END,'YYYY-MM-DD')");
      binds.S_END = payload.SCHEDULE_END_DATE;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "UPDATED_BY")) {
      fields.push("UPDATED_BY = :UPDATED_BY");
      binds.UPDATED_BY = payload.UPDATED_BY;
    }

    if (!fields.length) {
      return { success: false, message: "No fields provided to update" };
    }

    fields.push("UPDATED_DATE = SYSDATE");
    const sql = `UPDATE PM_SCHEDUL_L SET ${fields.join(", ")} WHERE L_ID = :L_ID`;
    const result = await connection.execute(sql, binds, { autoCommit: true });
    return {
      success: result.rowsAffected > 0,
      message: "Updated",
      L_ID: payload.L_ID,
    };
  } finally {
    await connection.close();
  }
}

export async function deleteGantt(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM PM_SCHEDUL_L WHERE L_ID = :L_ID",
      { L_ID: payload.L_ID },
      { autoCommit: true }
    );
    return {
      success: result.rowsAffected > 0,
      message: "Deleted",
      L_ID: payload.L_ID,
    };
  } finally {
    await connection.close();
  }
}