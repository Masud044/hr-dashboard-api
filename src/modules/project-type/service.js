import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function listProjectTypes() {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "SELECT ID, NAME, DESCRIPTION FROM PM_PROJECT_TYPE ORDER BY ID",
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function createProjectType(payload) {
  const connection = await getConnection();
  try {
    const seqResult = await connection.execute(
      "SELECT NVL(MAX(ID),0)+1 AS NEW_ID FROM PM_PROJECT_TYPE",
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const newId = seqResult.rows?.[0]?.NEW_ID;

    const insertResult = await connection.execute(
      "INSERT INTO PM_PROJECT_TYPE (ID, NAME, DESCRIPTION) VALUES (:id, :name, :description)",
      {
        id: newId,
        name: payload.NAME,
        description: payload.DESCRIPTION ?? null
      },
      { autoCommit: true }
    );

    return { success: insertResult.rowsAffected > 0, id: newId };
  } finally {
    await connection.close();
  }
}

export async function updateProjectType(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "UPDATE PM_PROJECT_TYPE SET NAME = :name, DESCRIPTION = :description WHERE ID = :id",
      {
        name: payload.NAME,
        description: payload.DESCRIPTION ?? null,
        id: payload.ID
      },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } finally {
    await connection.close();
  }
}

export async function deleteProjectType(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM PM_PROJECT_TYPE WHERE ID = :id",
      { id: payload.ID },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } finally {
    await connection.close();
  }
}