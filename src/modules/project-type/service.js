import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

const TABLE = "PM_PROJECT_TYPE";

// ─── LIST ──────────────────────────────────────────────────────────────────────
export async function listProjectTypes() {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT ID, NAME, DESCRIPTION FROM ${TABLE} ORDER BY ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ─── GET BY ID ─────────────────────────────────────────────────────────────────
export async function getProjectTypeById(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT ID, NAME, DESCRIPTION FROM ${TABLE} WHERE ID = :id`,
      { id: Number(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows?.[0] ?? null;
  } finally {
    await connection.close();
  }
}

// ─── CREATE — trigger generates ID, use RETURNING to get it back ───────────────
export async function createProjectType(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `INSERT INTO ${TABLE} (NAME, DESCRIPTION)
       VALUES (:name, :description)
       RETURNING ID INTO :newId`,
      {
        name:        payload.NAME,
        description: payload.DESCRIPTION ?? null,
        newId:       { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
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
export async function updateProjectType(payload) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `UPDATE ${TABLE}
       SET NAME = :name, DESCRIPTION = :description
       WHERE ID = :id`,
      {
        name:        payload.NAME,
        description: payload.DESCRIPTION ?? null,
        id:          Number(payload.ID),
      },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } finally {
    await connection.close();
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────
export async function deleteProjectType(payload) {
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