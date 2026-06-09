import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

const TABLE = "PM_CONTRACTOR_TYPE";

// ─── LIST ──────────────────────────────────────────────────────────────────────
export async function listContractorTypes() {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT ID, NAME FROM ${TABLE} ORDER BY ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ─── CREATE — trigger generates ID, use RETURNING to get it back ───────────────
export async function createContractorType(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `INSERT INTO ${TABLE} (NAME)
       VALUES (:name)
       RETURNING ID INTO :newId`,
      {
        name:  payload.NAME,
        newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    const newId = result.outBinds.newId[0];
    return { success: true, id: newId };
  } finally {
    await connection.close();
  }
}

// ─── UPDATE ────────────────────────────────────────────────────────────────────
export async function updateContractorType(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `UPDATE ${TABLE} SET NAME = :name WHERE ID = :id`,
      {
        name: payload.NAME,
        id:   Number(payload.ID),
      },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } finally {
    await connection.close();
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────
export async function deleteContractorType(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `DELETE FROM ${TABLE} WHERE ID = :id`,
      { id: Number(payload.ID) },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } finally {
    await connection.close();
  }
}