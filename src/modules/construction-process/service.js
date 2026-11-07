// // src\modules\construction-process\service.js
// import oracledb from "oracledb";
// import { getConnection } from "../../config/db.js";

// // ── Construction Process CRUD ─────────────────────────────────────────────────

// export async function createConstructionProcess(data) {
//   const connection = await getConnection();
//   try {
//     const { PROCESS_ID, SUB_CONTRACT_ID, DEPENDENT_ID, SORT_ID, CREATION_BY, UPDATED_BY, COST, CONTRACTOR_ID } = data;
//     const result = await connection.execute(
//       `INSERT INTO PM_CONSTRUCTION_PROCESS
//         (PROCESS_ID, SUB_CONTRACT_ID, DEPENDENT_ID, SORT_ID,
//          CREATION_BY, UPDATED_BY, COST, CONTRACTOR_ID)
//        VALUES
//         (:PROCESS_ID, :SUB_CONTRACT_ID, :DEPENDENT_ID, :SORT_ID,
//          :CREATION_BY, :UPDATED_BY, :COST, :CONTRACTOR_ID)`,
//       { PROCESS_ID, SUB_CONTRACT_ID, DEPENDENT_ID, SORT_ID, CREATION_BY, UPDATED_BY, COST, CONTRACTOR_ID },
//       { autoCommit: true }
//     );
//     return result.rowsAffected > 0;
//   } finally {
//     await connection.close();
//   }
// }

// export async function readConstructionProcess(PROCESS_ID) {
//   const connection = await getConnection();
//   try {
//     const sql = `
//       SELECT
//         cp.ID,
//         cp.PROCESS_ID,
//         cp.SUB_CONTRACT_ID,
//         cp.DEPENDENT_ID,
//         cp.SORT_ID,
//         cp.COST,
//         cp.CONTRACTOR_ID,
//         ci.CONTRATOR_NAME,
//         ci.PHONE,
//         ci.EMAIL,
//         TO_CHAR(cp.CREATION_DATE, 'YYYY-MM-DD') AS CREATION_DATE,
//         TO_CHAR(cp.UPDATE_DATE,   'YYYY-MM-DD') AS UPDATE_DATE
//       FROM PM_CONSTRUCTION_PROCESS cp
//       LEFT JOIN PM_CONTRACTOR_INFO ci
//         ON cp.CONTRACTOR_ID = ci.CONTRATOR_ID
//       ${Number(PROCESS_ID) > 0 ? "WHERE cp.PROCESS_ID = :c_id_bv" : ""}
//       ORDER BY cp.SORT_ID
//     `;
//     const binds = Number(PROCESS_ID) > 0 ? { c_id_bv: Number(PROCESS_ID) } : {};
//     const result = await connection.execute(sql, binds, {
//       outFormat: oracledb.OUT_FORMAT_OBJECT,
//     });
//     return result.rows || [];
//   } finally {
//     await connection.close();
//   }
// }

// export async function updateConstructionProcess(data) {
//   const connection = await getConnection();
//   try {
//     const { ID, DEPENDENT_ID, SORT_ID, UPDATED_BY, COST, CONTRACTOR_ID } = data;
//     const result = await connection.execute(
//       `UPDATE PM_CONSTRUCTION_PROCESS
//          SET DEPENDENT_ID  = :DEPENDENT_ID,
//              SORT_ID       = :SORT_ID,
//              UPDATED_BY    = :UPDATED_BY,
//              COST          = :COST,
//              CONTRACTOR_ID = :CONTRACTOR_ID,
//              UPDATE_DATE   = SYSDATE
//        WHERE ID = :ID`,
//       { ID, DEPENDENT_ID, SORT_ID, UPDATED_BY, COST, CONTRACTOR_ID },
//       { autoCommit: true }
//     );
//     return result.rowsAffected > 0;
//   } finally {
//     await connection.close();
//   }
// }

// export async function deleteConstructionProcess(ID) {
//   const connection = await getConnection();
//   try {
//     const result = await connection.execute(
//       "DELETE FROM PM_CONSTRUCTION_PROCESS WHERE ID = :ID",
//       { ID: Number(ID) },
//       { autoCommit: true }
//     );
//     return result.rowsAffected > 0;
//   } finally {
//     await connection.close();
//   }
// }

// // ── Contractor Type dropdown ──────────────────────────────────────────────────

// export async function getContractorTypes() {
//   const connection = await getConnection();
//   try {
//     const result = await connection.execute(
//       `SELECT ID, NAME FROM PM_CONTRACTOR_TYPE ORDER BY NAME`,
//       {},
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows || [];
//   } finally {
//     await connection.close();
//   }
// }

// // ── Contractor list filtered by Type ─────────────────────────────────────────

// export async function getContractorsByType(typeId) {
//   const connection = await getConnection();
//   try {
//     const result = await connection.execute(
//       `SELECT
//          ci.CONTRATOR_ID,
//          ci.CONTRATOR_NAME,
//          ci.PHONE,
//          ci.EMAIL
//        FROM PM_CONTRACTOR_INFO ci
//        JOIN PM_CONTRACTOR_TYPE_INFO cti
//          ON ci.CONTRATOR_ID = cti.CONTRUCTOR_ID
//        WHERE cti.CONTRUCTOR_TYPE = :typeId
//          AND ci.STATUS = 1
//        ORDER BY ci.CONTRATOR_NAME`,
//       { typeId: Number(typeId) },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     return result.rows || [];
//   } finally {
//     await connection.close();
//   }
// }

// src\modules\construction-process\service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// Accepts: array, single value, "1,2,3" string, null. Returns unique positive number[].
const toIds = (v) => {
  let arr = [];
  if (Array.isArray(v)) arr = v;
  else if (v !== null && v !== undefined && v !== "") arr = String(v).split(",");
  return [
    ...new Set(
      arr.map((x) => Number(String(x).trim())).filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
};

// ── Construction Process CRUD ─────────────────────────────────────────────────

export async function createConstructionProcess(data) {
  const connection = await getConnection();
  try {
    const { PROCESS_ID, SUB_CONTRACT_ID, DEPENDENT_ID, SORT_ID, CREATION_BY, UPDATED_BY, COST, CONTRACTOR_ID } = data;
    const result = await connection.execute(
      `INSERT INTO PM_CONSTRUCTION_PROCESS
        (PROCESS_ID, SUB_CONTRACT_ID, DEPENDENT_ID, SORT_ID,
         CREATION_BY, UPDATED_BY, COST, CONTRACTOR_ID)
       VALUES
        (:PROCESS_ID, :SUB_CONTRACT_ID, :DEPENDENT_ID, :SORT_ID,
         :CREATION_BY, :UPDATED_BY, :COST, :CONTRACTOR_ID)`,
      { PROCESS_ID, SUB_CONTRACT_ID, DEPENDENT_ID, SORT_ID, CREATION_BY, UPDATED_BY, COST, CONTRACTOR_ID },
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
    const hasProcess = Number(PROCESS_ID) > 0;
    const where      = hasProcess ? "WHERE cp.PROCESS_ID = :c_id_bv" : "";
    const binds      = hasProcess ? { c_id_bv: Number(PROCESS_ID) } : {};

    const sql = `
      SELECT
        cp.ID,
        cp.PROCESS_ID,
        cp.SUB_CONTRACT_ID,
        cp.DEPENDENT_ID,
        cp.SORT_ID,
        cp.COST,
        cp.CONTRACTOR_ID,
        ci.CONTRATOR_NAME,
        ci.PHONE,
        ci.EMAIL,
        TO_CHAR(cp.CREATION_DATE, 'YYYY-MM-DD') AS CREATION_DATE,
        TO_CHAR(cp.UPDATE_DATE,   'YYYY-MM-DD') AS UPDATE_DATE
      FROM PM_CONSTRUCTION_PROCESS cp
      LEFT JOIN PM_CONTRACTOR_INFO ci
        ON cp.CONTRACTOR_ID = ci.CONTRATOR_ID
      ${where}
      ORDER BY cp.SORT_ID
    `;
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    const rows = result.rows || [];
    if (rows.length === 0) return rows;

    // multiselect values from the junction tables
    const subQuery = `SELECT cp.ID FROM PM_CONSTRUCTION_PROCESS cp ${where}`;
    const [cRes, dRes] = await Promise.all([
      connection.execute(
        `SELECT CP_ID, CONTRACTOR_ID FROM PM_CP_CONTRACTOR WHERE CP_ID IN (${subQuery}) ORDER BY ASSIGNMENT_ID`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT CP_ID, DEPENDENT_ID FROM PM_CP_DEPENDENT WHERE CP_ID IN (${subQuery}) ORDER BY ASSIGNMENT_ID`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
    ]);

    const group = (list, key) => {
      const map = new Map();
      for (const r of list.rows || []) {
        if (!map.has(r.CP_ID)) map.set(r.CP_ID, []);
        map.get(r.CP_ID).push(r[key]);
      }
      return map;
    };
    const cMap = group(cRes, "CONTRACTOR_ID");
    const dMap = group(dRes, "DEPENDENT_ID");

    return rows.map((r) => ({
      ...r,
      CONTRACTOR_IDS: cMap.get(r.ID) || [],
      DEPENDENT_IDS:  dMap.get(r.ID) || [],
    }));
  } finally {
    await connection.close();
  }
}

// Keep a junction table in sync with the selected ids: delete the removed ones,
// insert only the new ones (so ASSIGNED_BY / ASSIGNED_AT of unchanged rows are kept).
async function syncAssignments(connection, table, column, cpId, ids, assignedBy) {
  if (ids.length) {
    const binds = { cp: cpId };
    const placeholders = ids
      .map((id, i) => {
        binds[`i${i}`] = id;
        return `:i${i}`;
      })
      .join(",");
    await connection.execute(
      `DELETE FROM ${table} WHERE CP_ID = :cp AND ${column} NOT IN (${placeholders})`,
      binds
    );
  } else {
    await connection.execute(`DELETE FROM ${table} WHERE CP_ID = :cp`, { cp: cpId });
  }

  const existing = await connection.execute(
    `SELECT ${column} FROM ${table} WHERE CP_ID = :cp`,
    { cp: cpId },
    { outFormat: oracledb.OUT_FORMAT_ARRAY }
  );
  const have  = new Set(existing.rows.map((r) => Number(r[0])));
  const toAdd = ids.filter((id) => !have.has(id));

  if (toAdd.length) {
    await connection.executeMany(
      `INSERT INTO ${table} (CP_ID, ${column}, ASSIGNED_BY) VALUES (:cp_id, :item_id, :assigned_by)`,
      toAdd.map((id) => ({ cp_id: cpId, item_id: id, assigned_by: assignedBy }))
    );
  }
}

export async function updateConstructionProcess(data) {
  const connection = await getConnection();
  try {
    const { SORT_ID, UPDATED_BY, COST } = data;
    const ID = Number(data.ID);

    // new array fields first, old single fields still work for other callers
    const contractorIds = toIds(data.CONTRACTOR_IDS ?? data.CONTRACTOR_ID);
    const dependentIds  = toIds(data.DEPENDENT_IDS  ?? data.DEPENDENT_ID);

    // The old single columns keep the FIRST selected value so the existing
    // join in readConstructionProcess and any other module using them keep working.
    const result = await connection.execute(
      `UPDATE PM_CONSTRUCTION_PROCESS
         SET DEPENDENT_ID  = :DEPENDENT_ID,
             SORT_ID       = :SORT_ID,
             UPDATED_BY    = :UPDATED_BY,
             COST          = :COST,
             CONTRACTOR_ID = :CONTRACTOR_ID,
             UPDATE_DATE   = SYSDATE
       WHERE ID = :ID`,
      {
        ID,
        DEPENDENT_ID:  dependentIds[0]  ?? null,
        SORT_ID,
        UPDATED_BY,
        COST,
        CONTRACTOR_ID: contractorIds[0] ?? null,
      }
    );

    if (result.rowsAffected === 0) {
      await connection.rollback();
      return false;
    }

    // save the selections
    const assignedBy = Number(UPDATED_BY) || 0;
    await syncAssignments(connection, "PM_CP_CONTRACTOR", "CONTRACTOR_ID", ID, contractorIds, assignedBy);
    await syncAssignments(connection, "PM_CP_DEPENDENT",  "DEPENDENT_ID",  ID, dependentIds,  assignedBy);

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function deleteConstructionProcess(ID) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "DELETE FROM PM_CONSTRUCTION_PROCESS WHERE ID = :ID",
      { ID: Number(ID) },
      { autoCommit: true }
    );
    return result.rowsAffected > 0;
  } finally {
    await connection.close();
  }
}

// ── Contractor Type dropdown ──────────────────────────────────────────────────

export async function getContractorTypes() {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT ID, NAME FROM PM_CONTRACTOR_TYPE ORDER BY NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ── Contractor list filtered by Type ─────────────────────────────────────────

export async function getContractorsByType(typeId) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT
         ci.CONTRATOR_ID,
         ci.CONTRATOR_NAME,
         ci.PHONE,
         ci.EMAIL
       FROM PM_CONTRACTOR_INFO ci
       JOIN PM_CONTRACTOR_TYPE_INFO cti
         ON ci.CONTRATOR_ID = cti.CONTRUCTOR_ID
       WHERE cti.CONTRUCTOR_TYPE = :typeId
         AND ci.STATUS = 1
       ORDER BY ci.CONTRATOR_NAME`,
      { typeId: Number(typeId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}