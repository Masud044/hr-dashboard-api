import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function createConstructionProcess(data) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `INSERT INTO PM_CONSTRUCTION_PROCESS
      (ID, PROCESS_ID, SUB_CONTRACT_ID, DEPENDENT_ID, SORT_ID, CREATION_BY, UPDATED_BY, COST, CONTRACTOR_ID)
      VALUES (:ID, :PROCESS_ID, :SUB_CONTRACT_ID, :DEPENDENT_ID, :SORT_ID, :CREATION_BY, :UPDATED_BY, :COST, :CONTRACTOR_ID)`,
      data,
      { autoCommit: true }
    );
    return result.rowsAffected > 0;
  } finally {
    await connection.close();
  }
}

export async function readConstructionProcess(PROCESS_ID) {
  const connection = await getConnection();
  try {
    const sql = PROCESS_ID > 0
      ? "SELECT * FROM PM_CONSTRUCTION_PROCESS WHERE PROCESS_ID = :c_id_bv"
      : "SELECT * FROM PM_CONSTRUCTION_PROCESS";
    const result = await connection.execute(sql, PROCESS_ID > 0 ? { c_id_bv: PROCESS_ID } : {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// export async function updateConstructionProcess(data) {
//   const connection = await getConnection();
//   try {
//     const result = await connection.execute(
//       `UPDATE PM_CONSTRUCTION_PROCESS
//        SET DEPENDENT_ID = :DEPENDENT_ID, SORT_ID = :SORT_ID, UPDATED_BY = :UPDATED_BY, COST = :COST, CONTRACTOR_ID = :CONTRACTOR_ID
//        WHERE ID = :ID`,
//       data,
//       { autoCommit: true }
//     );
//     return result.rowsAffected > 0;
//   } finally {
//     await connection.close();
//   }
// }

export async function updateConstructionProcess(data) {
  const connection = await getConnection();
  try {
    // ✅ Destructure only what the SQL needs — prevents ORA-01036 from extra fields
    const { ID, DEPENDENT_ID, SORT_ID, UPDATED_BY, COST, CONTRACTOR_ID } = data;

    const result = await connection.execute(
      `UPDATE PM_CONSTRUCTION_PROCESS
       SET DEPENDENT_ID  = :DEPENDENT_ID,
           SORT_ID       = :SORT_ID,
           UPDATED_BY    = :UPDATED_BY,
           COST          = :COST,
           CONTRACTOR_ID = :CONTRACTOR_ID
       WHERE ID = :ID`,
      { ID, DEPENDENT_ID, SORT_ID, UPDATED_BY, COST, CONTRACTOR_ID }, // ✅ clean bind object
      { autoCommit: true }
    );
    return result.rowsAffected > 0;
  } finally {
    await connection.close();
  }
}

export async function deleteConstructionProcess(ID) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM PM_CONSTRUCTION_PROCESS WHERE ID = :ID",
      { ID },
      { autoCommit: true }
    );
    return result.rowsAffected > 0;
  } finally {
    await connection.close();
  }
}
