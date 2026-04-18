import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function createSupplier(data) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `INSERT INTO BWAL.SUPPLIER_INFO (
        SUPPLIER_NAME, ENTRY_BY, UPDATE_BY, UPDATE_DATE, STATUS, PASSWORD,
        ORG_ID, ADDRESS, CONTACT_PERSON, PHONE, EMAIL, MOBILE, DUE, REMARKS, FAX
      ) VALUES (
        :supplier_name, :entry_by, NULL, NULL, :status, :password,
        :org_id, :address, :contact_person, :phone, :email, :mobile, :due, :remarks, :fax
      ) RETURNING SUPPLIER_ID INTO :last_id`,
      {
        supplier_name: data.SUPPLIER_NAME,
        entry_by: data.ENTRY_BY,
        status: data.STATUS,
        password: data.PASSWORD,
        org_id: data.ORG_ID,
        address: data.ADDRESS,
        contact_person: data.CONTACT_PERSON,
        phone: data.PHONE,
        email: data.EMAIL,
        mobile: data.MOBILE,
        due: data.DUE,
        remarks: data.REMARKS,
        fax: data.FAX,
        last_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      },
      { autoCommit: true }
    );

    return result.outBinds.last_id[0];
  } finally {
    await connection.close();
  }
}

export async function readSupplier(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "SELECT * FROM BWAL.SUPPLIER_INFO WHERE SUPPLIER_ID = :supplier_id",
      { supplier_id: Number(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows?.[0] || null;
  } finally {
    await connection.close();
  }
}

export async function readAllSuppliers() {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "SELECT * FROM BWAL.SUPPLIER_INFO ORDER BY SUPPLIER_ID DESC",
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function updateSupplier(data) {
  const connection = await getConnection();
  try {
    const allowed = [
      "SUPPLIER_NAME", "UPDATE_BY", "STATUS", "PASSWORD", "ORG_ID", "ADDRESS",
      "CONTACT_PERSON", "PHONE", "EMAIL", "MOBILE", "DUE", "REMARKS", "FAX"
    ];
    const setClauses = [];
    const binds = { supplier_id: data.SUPPLIER_ID };
    for (const col of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, col)) {
        setClauses.push(`${col} = :${col}`);
        binds[col] = data[col];
      }
    }
    if (!setClauses.length) return { noFields: true, rowsAffected: 0 };
    setClauses.push("UPDATE_DATE = SYSDATE");
    const sql = `UPDATE BWAL.SUPPLIER_INFO SET ${setClauses.join(", ")} WHERE SUPPLIER_ID = :supplier_id`;
    const result = await connection.execute(sql, binds, { autoCommit: true });
    return { rowsAffected: result.rowsAffected };
  } finally {
    await connection.close();
  }
}

export async function deleteSupplier(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM BWAL.SUPPLIER_INFO WHERE SUPPLIER_ID = :supplier_id",
      { supplier_id: Number(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}
