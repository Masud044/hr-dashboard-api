import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function listContractorTypes() {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "SELECT ID, NAME FROM PM_CONTRACTOR_TYPE ORDER BY ID",
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function createContractorType(payload) {
  const connection = await getConnection();
  try {
    const seqResult = await connection.execute(
      "SELECT NVL(MAX(ID),0)+1 AS NEW_ID FROM PM_CONTRACTOR_TYPE",
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const newId = seqResult.rows?.[0]?.NEW_ID;

    const insertResult = await connection.execute(
      "INSERT INTO PM_CONTRACTOR_TYPE (ID, NAME) VALUES (:id, :name)",
      { id: newId, name: payload.NAME },
      { autoCommit: true }
    );

    return { success: insertResult.rowsAffected > 0, id: newId };
  } finally {
    await connection.close();
  }
}

export async function updateContractorType(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "UPDATE PM_CONTRACTOR_TYPE SET NAME = :name WHERE ID = :id",
      { id: payload.ID, name: payload.NAME },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } finally {
    await connection.close();
  }
}

export async function deleteContractorType(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM PM_CONTRACTOR_TYPE WHERE ID = :id",
      { id: payload.ID },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } finally {
    await connection.close();
  }
}
