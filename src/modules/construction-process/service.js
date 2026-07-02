// src\modules\construction-process\service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

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
      ${Number(PROCESS_ID) > 0 ? "WHERE cp.PROCESS_ID = :c_id_bv" : ""}
      ORDER BY cp.SORT_ID
    `;
    const binds = Number(PROCESS_ID) > 0 ? { c_id_bv: Number(PROCESS_ID) } : {};
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function updateConstructionProcess(data) {
  const connection = await getConnection();
  try {
    const { ID, DEPENDENT_ID, SORT_ID, UPDATED_BY, COST, CONTRACTOR_ID } = data;
    const result = await connection.execute(
      `UPDATE PM_CONSTRUCTION_PROCESS
         SET DEPENDENT_ID  = :DEPENDENT_ID,
             SORT_ID       = :SORT_ID,
             UPDATED_BY    = :UPDATED_BY,
             COST          = :COST,
             CONTRACTOR_ID = :CONTRACTOR_ID,
             UPDATE_DATE   = SYSDATE
       WHERE ID = :ID`,
      { ID, DEPENDENT_ID, SORT_ID, UPDATED_BY, COST, CONTRACTOR_ID },
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