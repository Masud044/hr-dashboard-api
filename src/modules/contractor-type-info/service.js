import { poolExecute } from "../../config/db.js";
import oracledb from "oracledb";

// ─── PM_CONTRACTOR_TYPE_INFO ──────────────────────────────────────────────────
// FK Relations:
//   CONTRUCTOR_ID  → PM_CONTRACTOR_INFO.CONTRATOR_ID  (contractor details)
//   CONTRUCTOR_TYPE → PM_CONTRACTOR_TYPE.ID            (type name lookup)
// ─────────────────────────────────────────────────────────────────────────────

const SELECT_COLS = `
  cti.TYPE_ID,
  cti.CONTRUCTOR_ID,
  ci.CONTRATOR_NAME       AS CONTRACTOR_NAME,
  cti.CONTRUCTOR_TYPE,
  ct.NAME                 AS CONTRUCTOR_TYPE_NAME,
  cti.CREATED_BY,
  cti.UPDATE_BY,
  cti.UPDATED_DATE,
  cti.ENTRY_DATE
`;

const FROM_JOINS = `
  FROM PM_CONTRACTOR_TYPE_INFO cti
  LEFT JOIN PM_CONTRACTOR_INFO ci
         ON ci.CONTRATOR_ID = cti.CONTRUCTOR_ID
  LEFT JOIN PM_CONTRACTOR_TYPE ct
         ON ct.ID = cti.CONTRUCTOR_TYPE
`;

/**
 * GET all rows — joins both PM_CONTRACTOR_INFO and PM_CONTRACTOR_TYPE
 */
export async function getAllContractorTypeInfo() {
  const sql = `SELECT ${SELECT_COLS} ${FROM_JOINS} ORDER BY cti.TYPE_ID`;
  const result = await poolExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return result.rows;
}

/**
 * GET single row by TYPE_ID
 */
export async function getContractorTypeInfoById(typeId) {
  const sql = `SELECT ${SELECT_COLS} ${FROM_JOINS} WHERE cti.TYPE_ID = :typeId`;
  const result = await poolExecute(
    sql,
    { typeId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows[0] ?? null;
}

/**
 * GET all type info rows for a specific contractor (CONTRUCTOR_ID)
 */
export async function getContractorTypeInfoByContractorId(contractorId) {
  const sql = `
    SELECT ${SELECT_COLS} ${FROM_JOINS}
    WHERE cti.CONTRUCTOR_ID = :contractorId
    ORDER BY cti.TYPE_ID
  `;
  const result = await poolExecute(
    sql,
    { contractorId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows;
}

/**
 * CREATE a new PM_CONTRACTOR_TYPE_INFO row.
 */
export async function createContractorTypeInfo(data) {
  const { contructorId, contructorType, createdBy, updateBy } = data;

  const sql = `
    INSERT INTO PM_CONTRACTOR_TYPE_INFO (
     
      CONTRUCTOR_ID,
      CONTRUCTOR_TYPE,
      CREATED_BY,
      UPDATE_BY,
      UPDATED_DATE,
      ENTRY_DATE
    ) VALUES (
     
      :contructorId,
      :contructorType,
      :createdBy,
      :updateBy,
      SYSDATE,
      SYSDATE
    )
    RETURNING TYPE_ID INTO :newId
  `;

  const binds = {
    contructorId:   contructorId   ?? null,
    contructorType: contructorType ?? null,
    createdBy:      createdBy      ?? null,
    updateBy:       updateBy       ?? null,
    newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };

  const result = await poolExecute(sql, binds, { autoCommit: true });
  return { typeId: result.outBinds.newId[0] };
}

/**
 * UPDATE an existing PM_CONTRACTOR_TYPE_INFO row.
 */
export async function updateContractorTypeInfo(typeId, data) {
  const { contructorId, contructorType, updateBy } = data;

  const sql = `
    UPDATE PM_CONTRACTOR_TYPE_INFO
    SET
      CONTRUCTOR_ID   = :contructorId,
      CONTRUCTOR_TYPE = :contructorType,
      UPDATE_BY       = :updateBy,
      UPDATED_DATE    = SYSDATE
    WHERE TYPE_ID = :typeId
  `;

  const result = await poolExecute(
    sql,
    { contructorId, contructorType, updateBy, typeId },
    { autoCommit: true }
  );
  return result.rowsAffected;
}

/**
 * DELETE a PM_CONTRACTOR_TYPE_INFO row.
 */
export async function deleteContractorTypeInfo(typeId) {
  const sql = `DELETE FROM PM_CONTRACTOR_TYPE_INFO WHERE TYPE_ID = :typeId`;
  const result = await poolExecute(sql, { typeId }, { autoCommit: true });
  return result.rowsAffected;
}

// ─── Lookup dropdowns ─────────────────────────────────────────────────────────

/**
 * GET all PM_CONTRACTOR_TYPE rows — for type dropdown
 */
export async function getAllContractorTypes() {
  const sql = `SELECT ID, NAME FROM PM_CONTRACTOR_TYPE ORDER BY ID`;
  const result = await poolExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return result.rows;
}

/**
 * GET all PM_CONTRACTOR_INFO rows — for contractor dropdown
 */
export async function getAllContractors() {
  const sql = `
    SELECT CONTRATOR_ID AS ID, CONTRATOR_NAME AS NAME
    FROM PM_CONTRACTOR_INFO
    WHERE STATUS = 1
    ORDER BY CONTRATOR_ID
  `;
  const result = await poolExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return result.rows;
}