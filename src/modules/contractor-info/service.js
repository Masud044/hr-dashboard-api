// src\modules\contractor-info\service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
//  SANITIZE HELPER
//  Table column types অনুযায়ী:
//  VARCHAR2 columns → "" বা undefined হলে null
//  NUMBER  columns  → coerce to Number; nullable ones null OK
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeContractor(data) {
  const s = {};

  // VARCHAR2 columns — empty string → null
  const varcharFields = [
    "CONTRATOR_NAME",                           // VARCHAR2(300) NOT practical null
    "ABN", "LIEC_NO", "SUBURB", "POSTCODE",
    "STATE", "ADDRESS", "CONTACT_PERSON",
    "PHONE", "EMAIL", "MOBILE",
    "DUE",                                      // VARCHAR2(20)
    "REMARKS",                                  // VARCHAR2(1000)
    "FAX",                                      // VARCHAR2(20)
    "BANK_ACC_NAME", "BSB", "AC_NO",
    "INSURER", "POLICY_NUMBER",
  ];

  for (const f of varcharFields) {
    const v = data[f];
    s[f] = (v === undefined || v === null || v === "") ? null : String(v);
  }

  // NUMBER columns — must be real numbers or null (nullable ones)
  s.ENTRY_BY      = Number(data.ENTRY_BY)      || 500;
  s.UPDATE_BY     = Number(data.UPDATE_BY)     || s.ENTRY_BY;
  s.STATUS        = Number(data.STATUS)        || 1;
  s.CUSTOMER_TYPE = (data.CUSTOMER_TYPE === undefined ||
                     data.CUSTOMER_TYPE === null ||
                     data.CUSTOMER_TYPE === "")
                     ? null
                     : Number(data.CUSTOMER_TYPE);

  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  QUERIES  (private — not exported)
// ─────────────────────────────────────────────────────────────────────────────

// ── INSERT parent row → returns CONTRATOR_ID ─────────────────────────────────
async function insertContractorQuery(connection, data) {
  const binds = {
    CONTRATOR_NAME:  data.CONTRATOR_NAME,
    ENTRY_BY:        data.ENTRY_BY,
    UPDATE_BY:       data.UPDATE_BY,
    STATUS:          data.STATUS,
    ABN:             data.ABN,
    LIEC_NO:         data.LIEC_NO,
    SUBURB:          data.SUBURB,
    POSTCODE:        data.POSTCODE,
    STATE:           data.STATE,
    ADDRESS:         data.ADDRESS,
    CONTACT_PERSON:  data.CONTACT_PERSON,
    PHONE:           data.PHONE,
    EMAIL:           data.EMAIL,
    MOBILE:          data.MOBILE,
    DUE:             data.DUE,            // VARCHAR2(20) — null OK
    REMARKS:         data.REMARKS,        // VARCHAR2(1000) — null OK
    FAX:             data.FAX,            // VARCHAR2(20) — null OK
    CUSTOMER_TYPE:   data.CUSTOMER_TYPE,  // NUMBER nullable — null OK
    BANK_ACC_NAME:   data.BANK_ACC_NAME,
    BSB:             data.BSB,
    AC_NO:           data.AC_NO,
    INSURER:         data.INSURER,
    POLICY_NUMBER:   data.POLICY_NUMBER,
    new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };

  const result = await connection.execute(
    `INSERT INTO PM_CONTRACTOR_INFO
       (CONTRATOR_NAME, ENTRY_DATE, ENTRY_BY, UPDATE_BY, STATUS,
        ABN, LIEC_NO, SUBURB, POSTCODE, STATE, ADDRESS,
        CONTACT_PERSON, PHONE, EMAIL, MOBILE,
        DUE, REMARKS, FAX,
        CUSTOMER_TYPE, BANK_ACC_NAME, BSB, AC_NO, INSURER, POLICY_NUMBER)
     VALUES
       (:CONTRATOR_NAME, SYSDATE, :ENTRY_BY, :UPDATE_BY, :STATUS,
        :ABN, :LIEC_NO, :SUBURB, :POSTCODE, :STATE, :ADDRESS,
        :CONTACT_PERSON, :PHONE, :EMAIL, :MOBILE,
        :DUE, :REMARKS, :FAX,
        :CUSTOMER_TYPE, :BANK_ACC_NAME, :BSB, :AC_NO, :INSURER, :POLICY_NUMBER)
     RETURNING CONTRATOR_ID INTO :new_id`,
    binds,
    { autoCommit: false }
  );

  return result.outBinds.new_id[0];
}

// ── UPDATE parent row ────────────────────────────────────────────────────────
async function updateContractorQuery(connection, data) {
  const setClauses = [];
  const binds = {
    c_id_bv:      Number(data.CONTRATOR_ID),
    update_by_bv: Number(data.UPDATE_BY),
  };

  // Only update fields that were actually provided
  const updatableFields = [
    "CONTRATOR_NAME", "STATUS",
    "ABN", "LIEC_NO", "SUBURB", "POSTCODE", "STATE", "ADDRESS",
    "CONTACT_PERSON", "PHONE", "EMAIL", "MOBILE",
    "DUE", "REMARKS", "FAX",
    "CUSTOMER_TYPE", "BANK_ACC_NAME", "BSB", "AC_NO",
    "INSURER", "POLICY_NUMBER",
  ];

  for (const f of updatableFields) {
    if (Object.prototype.hasOwnProperty.call(data, f)) {
      setClauses.push(`${f} = :${f}`);
      const v = data[f];
      binds[f] = (v === "" || v === undefined) ? null : v;
    }
  }

  setClauses.push("UPDATE_DATE = SYSDATE");
  setClauses.push("UPDATE_BY   = :update_by_bv");

  if (setClauses.length <= 2) return 0;

  const result = await connection.execute(
    `UPDATE PM_CONTRACTOR_INFO
        SET ${setClauses.join(", ")}
      WHERE CONTRATOR_ID = :c_id_bv`,
    binds,
    { autoCommit: false }
  );

  return result.rowsAffected;
}

// ── SELECT contractors (all or by ID) ────────────────────────────────────────
async function searchContractorQuery(contrator_id) {
  const connection = await getConnection();
  try {
    let sql = `
      SELECT CONTRATOR_ID, CONTRATOR_NAME, ENTRY_BY,
             TO_CHAR(ENTRY_DATE,  'YYYY-MM-DD HH24:MI:SS') AS ENTRY_DATE,
             UPDATE_BY,
             TO_CHAR(UPDATE_DATE, 'YYYY-MM-DD HH24:MI:SS') AS UPDATE_DATE,
             STATUS, ABN, LIEC_NO, SUBURB, POSTCODE, STATE, ADDRESS,
             CONTACT_PERSON, PHONE, EMAIL, MOBILE,
             DUE, REMARKS, FAX,
             CUSTOMER_TYPE, BANK_ACC_NAME, BSB, AC_NO, INSURER, POLICY_NUMBER,
             SORT_ORDER
        FROM PM_CONTRACTOR_INFO`;

    const binds = {};
    if (Number(contrator_id) > 0) {
      sql += " WHERE CONTRATOR_ID = :c_id_bv";
      binds.c_id_bv = Number(contrator_id);
    }

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ── DELETE parent row ────────────────────────────────────────────────────────
async function deleteContractorQuery(connection, id) {
  const result = await connection.execute(
    "DELETE FROM PM_CONTRACTOR_INFO WHERE CONTRATOR_ID = :id",
    { id: Number(id) },
    { autoCommit: false }
  );
  return result.rowsAffected;
}

// ── INSERT child type row → returns TYPE_ID ──────────────────────────────────
//  PM_CONTRACTOR_TYPE_INFO:
//    TYPE_ID(trigger), CONTRUCTOR_ID, CONTRUCTOR_TYPE,
//    CREATED_BY, UPDATE_BY,
//    UPDATED_DATE(DEFAULT SYSDATE), ENTRY_DATE(DEFAULT SYSDATE)
async function insertContractorTypeQuery(connection, typeData) {
  const binds = {
    CONTRUCTOR_ID:   Number(typeData.CONTRATOR_ID),
    CONTRUCTOR_TYPE: Number(typeData.CONTRATOR_TYPE),
    CREATED_BY:      Number(typeData.CREATED_BY ?? typeData.ENTRY_BY ?? 500),
    UPDATE_BY:       Number(typeData.UPDATE_BY  ?? typeData.ENTRY_BY ?? 500),
    new_type_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };

  const result = await connection.execute(
    `INSERT INTO PM_CONTRACTOR_TYPE_INFO
       (CONTRUCTOR_ID, CONTRUCTOR_TYPE, CREATED_BY, UPDATE_BY)
     VALUES
       (:CONTRUCTOR_ID, :CONTRUCTOR_TYPE, :CREATED_BY, :UPDATE_BY)
     RETURNING TYPE_ID INTO :new_type_id`,
    binds,
    { autoCommit: false }
  );

  return result.outBinds.new_type_id[0];
}

// ── DELETE all child type rows for a contractor ───────────────────────────────
async function deleteContractorTypesByContractorQuery(connection, contractorId) {
  const result = await connection.execute(
    "DELETE FROM PM_CONTRACTOR_TYPE_INFO WHERE CONTRUCTOR_ID = :id",
    { id: Number(contractorId) },
    { autoCommit: false }
  );
  return result.rowsAffected;
}

// ── SELECT all types for a contractor ────────────────────────────────────────
async function getContractorTypesQuery(contractorId) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT TYPE_ID, CONTRUCTOR_ID, CONTRUCTOR_TYPE, CREATED_BY, UPDATE_BY,
              TO_CHAR(ENTRY_DATE,   'YYYY-MM-DD HH24:MI:SS') AS ENTRY_DATE,
              TO_CHAR(UPDATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_DATE
         FROM PM_CONTRACTOR_TYPE_INFO
        WHERE CONTRUCTOR_ID = :id`,
      { id: Number(contractorId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── CREATE ────────────────────────────────────────────────────────────────────
export async function createContractorWithTypes(payload) {
  const { contractor, contractorTypes = [] } = payload;
  const sanitized = sanitizeContractor(contractor);
  const connection = await getConnection();

  try {
    // Step 1: Insert parent
    const contractorId = await insertContractorQuery(connection, sanitized);

    // Step 2: Insert child type rows
    const typeIds = [];
    for (const typeValue of contractorTypes) {
      const typeId = await insertContractorTypeQuery(connection, {
        CONTRATOR_ID:   contractorId,
        CONTRATOR_TYPE: typeValue,
        CREATED_BY:     sanitized.ENTRY_BY,
        UPDATE_BY:      sanitized.UPDATE_BY,
      });
      typeIds.push(typeId);
    }

    // Step 3: Commit
    await connection.commit();
    return { contractorId, typeIds };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ── READ ALL ──────────────────────────────────────────────────────────────────
export async function getContractors(contractorId = 0) {
  return searchContractorQuery(contractorId);
}

// ── READ ONE with types ───────────────────────────────────────────────────────
export async function getContractorDetail(contractorId) {
  const [contractors, types] = await Promise.all([
    searchContractorQuery(contractorId),
    getContractorTypesQuery(contractorId),
  ]);

  if (!contractors.length) return null;

  return {
    ...contractors[0],
    contractorTypes: types,
  };
}

// ── UPDATE ────────────────────────────────────────────────────────────────────
export async function updateContractorWithTypes(contractorId, payload) {
  const { contractor, contractorTypes = [] } = payload;
  const sanitized = sanitizeContractor(contractor);
  const connection = await getConnection();

  try {
    // Step 1: Delete existing child rows
    await deleteContractorTypesByContractorQuery(connection, contractorId);

    // Step 2: Insert new child rows
    const typeIds = [];
    for (const typeValue of contractorTypes) {
      const typeId = await insertContractorTypeQuery(connection, {
        CONTRATOR_ID:   contractorId,
        CONTRATOR_TYPE: typeValue,
        CREATED_BY:     sanitized.ENTRY_BY,
        UPDATE_BY:      sanitized.UPDATE_BY,
      });
      typeIds.push(typeId);
    }

    // Step 3: Update parent row
    await updateContractorQuery(connection, {
      ...sanitized,
      CONTRATOR_ID: contractorId,
    });

    // Step 4: Commit
    await connection.commit();
    return { contractorId, typeIds };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function deleteContractorWithTypes(contractorId) {
  const connection = await getConnection();

  try {
    // Step 1: Delete child rows first (FK constraint)
    await deleteContractorTypesByContractorQuery(connection, contractorId);

    // Step 2: Delete parent row
    const rowsAffected = await deleteContractorQuery(connection, contractorId);

    // Step 3: Commit
    await connection.commit();
    return rowsAffected;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}


// ── SELECT contractor↔type mapping (for filtering dropdowns) ─────────────────
export async function getContractorTypeInfoMap() {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT CONTRUCTOR_ID, CONTRUCTOR_TYPE FROM PM_CONTRACTOR_TYPE_INFO`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows || [];
  } finally {
    await connection.close();
  }
}



// ── REORDER: shift SORT_ORDER for a contractor to a new position ────────────
async function reorderContractorQuery(connection, contractorId, newPosition) {
  const current = await connection.execute(
    `SELECT SORT_ORDER FROM PM_CONTRACTOR_INFO WHERE CONTRATOR_ID = :id`,
    { id: Number(contractorId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (!current.rows.length) {
    throw new Error(`Contractor ${contractorId} not found`);
  }

  const oldPosition = current.rows[0].SORT_ORDER;

  const countResult = await connection.execute(
    `SELECT COUNT(*) AS TOTAL FROM PM_CONTRACTOR_INFO`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const totalCount = countResult.rows[0].TOTAL;

  let target = Number(newPosition);
  if (target < 1) target = 1;
  if (target > totalCount) target = totalCount;

  if (target === oldPosition) {
    return { contractorId, oldPosition, newPosition: target, moved: false };
  }

  // Step 1: park the moved row on a safe, non-colliding temp value
  await connection.execute(
    `UPDATE PM_CONTRACTOR_INFO SET SORT_ORDER = -1 WHERE CONTRATOR_ID = :id`,
    { id: Number(contractorId) },
    { autoCommit: false }
  );

  // Step 2: now shift the range safely, since the moved row is out of the way
  if (target < oldPosition) {
    await connection.execute(
      `UPDATE PM_CONTRACTOR_INFO
          SET SORT_ORDER = SORT_ORDER + 1
        WHERE SORT_ORDER >= :target AND SORT_ORDER < :oldPosition`,
      { target, oldPosition },
      { autoCommit: false }
    );
  } else {
    await connection.execute(
      `UPDATE PM_CONTRACTOR_INFO
          SET SORT_ORDER = SORT_ORDER - 1
        WHERE SORT_ORDER > :oldPosition AND SORT_ORDER <= :target`,
      { target, oldPosition },
      { autoCommit: false }
    );
  }

  // Step 3: place the moved contractor into its real new slot
  await connection.execute(
    `UPDATE PM_CONTRACTOR_INFO SET SORT_ORDER = :target WHERE CONTRATOR_ID = :id`,
    { target, id: Number(contractorId) },
    { autoCommit: false }
  );

  return { contractorId, oldPosition, newPosition: target, moved: true };
}

// ── EXPORTED: reorder a contractor to an explicit position (used by input box) ─
export async function reorderContractor(contractorId, newPosition) {
  const connection = await getConnection();
  try {
    const result = await reorderContractorQuery(connection, contractorId, newPosition);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ── EXPORTED: move up/down by one position (used by arrow buttons) ───────────
export async function moveContractor(contractorId, direction) {
  const connection = await getConnection();
  try {
    const current = await connection.execute(
      `SELECT SORT_ORDER FROM PM_CONTRACTOR_INFO WHERE CONTRATOR_ID = :id`,
      { id: Number(contractorId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!current.rows.length) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    const oldPosition = current.rows[0].SORT_ORDER;
    const target = direction === "up" ? oldPosition - 1 : oldPosition + 1;

    const result = await reorderContractorQuery(connection, contractorId, target);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}