import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function insertProject(data) {
  const connection = await getConnection();
 
  try {
    const result = await connection.execute(
      `INSERT INTO PM_PROJECT
       (P_NAME, P_TYPE, P_ADDRESS, SUBWRB, POSTCODE, STATE, USER_ID, USER_BY, UPDATED_BY)
       VALUES (:P_NAME, :P_TYPE, :P_ADDRESS, :SUBWRB, :POSTCODE, :STATE, :USER_ID, :USER_BY, :UPDATED_BY)
       RETURNING P_ID INTO :NEW_P_ID`,
      {
        P_NAME: data.P_NAME ?? "",
        P_TYPE: data.P_TYPE ?? "",
        P_ADDRESS: data.P_ADDRESS ?? "",
        SUBWRB: data.SUBWRB ?? "",
        POSTCODE: data.POSTCODE ?? "",
        STATE: data.STATE ?? "",
        USER_ID: Number(data.USER_ID ?? 0),
        USER_BY: Number(data.USER_BY ?? data.USER_ID ?? 0),
        UPDATED_BY: Number(data.UPDATED_BY ?? data.USER_ID ?? 0),
        NEW_P_ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      },
      { autoCommit: true }
    );
    return result.outBinds.NEW_P_ID[0];
  } finally {
    await connection.close();
  }
}

export async function searchProject(p_id) {
  const connection = await getConnection();
  try {
    let sql = `SELECT P_ID, P_NAME, P_TYPE, P_ADDRESS, SUBWRB, POSTCODE, STATE, USER_ID,
      TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATION_DATE,
      TO_CHAR(UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS') AS UPDATE_DATE, USER_BY, UPDATED_BY
      FROM PM_PROJECT`;
    const binds = {};
    if (p_id > 0) {
      sql += " WHERE P_ID = :p_id_bv";
      binds.p_id_bv = p_id;
    }
    const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function updateProject(data) {
  const connection = await getConnection();
  try {
    const p_id = Number(data.P_ID || 0);
    const set = [];
    const binds = { p_id_bv: p_id, updated_by_bv: Number(data.UPDATED_BY) };
    const fields = ["P_NAME", "P_TYPE", "P_ADDRESS", "SUBWRB", "POSTCODE", "STATE", "USER_ID"];
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        const key = field.toLowerCase();
        set.push(`${field} = :${key}`);
        binds[key] = field === "USER_ID" ? Number(data[field]) : data[field];
      }
    }
    set.push("UPDATE_DATE = SYSDATE");
    set.push("UPDATED_BY = :updated_by_bv");
    if (set.length <= 2) return 0;
    const sql = `UPDATE PM_PROJECT SET ${set.join(", ")} WHERE P_ID = :p_id_bv`;
    const result = await connection.execute(sql, binds, { autoCommit: true });
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}

export async function deleteProject(p_id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM PM_PROJECT WHERE P_ID = :p_id_bv",
      { p_id_bv: Number(p_id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}
