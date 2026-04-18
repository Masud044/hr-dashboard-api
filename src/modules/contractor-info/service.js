import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function insertContractor(data) {
  const connection = await getConnection();
  try {
    // const binds = { ...data, new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } };
    const binds = {
  ...data,
  UPDATE_BY: data.UPDATE_BY ?? data.ENTRY_BY ?? 500,
  STATUS: data.STATUS ?? 1,
  DUE: data.DUE ?? 0,
  REMARKS: data.REMARKS ?? null,
  FAX: data.FAX ?? null,
  new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
};
    const result = await connection.execute(
      `INSERT INTO PM_CONTRACTOR_INFO
      (CONTRATOR_NAME, ENTRY_BY, UPDATE_BY, STATUS, ABN, LIEC_NO, SUBURB, POSTCODE, STATE, ADDRESS, CONTACT_PERSON, PHONE, EMAIL, MOBILE, DUE, REMARKS, FAX)
      VALUES
      (:CONTRATOR_NAME, :ENTRY_BY, :UPDATE_BY, :STATUS, :ABN, :LIEC_NO, :SUBURB, :POSTCODE, :STATE, :ADDRESS, :CONTACT_PERSON, :PHONE, :EMAIL, :MOBILE, :DUE, :REMARKS, :FAX)
      RETURNING CONTRATOR_ID INTO :new_id`,
      binds,
      { autoCommit: true }
    );
    return result.outBinds.new_id[0];
  } finally {
    await connection.close();
  }
}

export async function searchContractor(contrator_id) {
  const connection = await getConnection();
  try {
    let sql = `SELECT CONTRATOR_ID, CONTRATOR_NAME, ENTRY_BY,
      TO_CHAR(ENTRY_DATE, 'YYYY-MM-DD HH24:MI:SS') AS ENTRY_DATE,
      UPDATE_BY, TO_CHAR(UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS') AS UPDATE_DATE,
      STATUS, ABN, LIEC_NO, SUBURB, POSTCODE, STATE, ADDRESS, CONTACT_PERSON,
      PHONE, EMAIL, MOBILE, DUE, REMARKS, FAX FROM PM_CONTRACTOR_INFO`;
    const binds = {};
    if (contrator_id > 0) {
      sql += " WHERE CONTRATOR_ID = :c_id_bv";
      binds.c_id_bv = contrator_id;
    }
    const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function updateContractor(data) {
  const connection = await getConnection();
  try {
    const set = [];
    const binds = { c_id_bv: data.CONTRATOR_ID, update_by_bv: Number(data.UPDATE_BY) };
    const fields = ["CONTRATOR_NAME", "STATUS", "ABN", "LIEC_NO", "SUBURB", "POSTCODE", "STATE", "ADDRESS", "CONTACT_PERSON", "PHONE", "EMAIL", "MOBILE", "DUE", "REMARKS", "FAX"];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(data, f)) {
        set.push(`${f} = :${f}`);
        binds[f] = data[f];
      }
    }
    set.push("UPDATE_DATE = SYSDATE");
    set.push("UPDATE_BY = :update_by_bv");
    if (set.length <= 2) return 0;
    const result = await connection.execute(
      `UPDATE PM_CONTRACTOR_INFO SET ${set.join(", ")} WHERE CONTRATOR_ID = :c_id_bv`,
      binds,
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}

export async function deleteContractor(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM PM_CONTRACTOR_INFO WHERE CONTRATOR_ID = :id",
      { id: Number(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}
