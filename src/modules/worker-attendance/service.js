// src/modules/worker-attendance/service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";
import { parse, differenceInMinutes, addHours } from "date-fns";

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────
function calcHours(startTime, endTime) {
  const refDate = new Date(2000, 0, 1);
  let start = parse(startTime, "HH:mm", refDate);
  let end = parse(endTime, "HH:mm", refDate);

  if (differenceInMinutes(end, start) < 0) {
    end = addHours(end, 24);
  }

  const diffMinutes = differenceInMinutes(end, start);
  return Math.round((diffMinutes / 60) * 100) / 100;
}

// function validateAndPrepare(data) {
//   if (!["TIME", "HOURS"].includes(data.ENTRY_MODE)) {
//     throw new Error("ENTRY_MODE must be 'TIME' or 'HOURS'.");
//   }
//   if (!["HOUR", "DAY"].includes(data.CALC_BASIS)) {
//     throw new Error("CALC_BASIS must be 'HOUR' or 'DAY'.");
//   }

//   let hoursWorked = null;
//   let daysWorked = null;
//   let startTime = null;
//   let endTime = null;

//   if (data.CALC_BASIS === "DAY") {
//     if (data.DAYS_WORKED == null) {
//       throw new Error("DAYS_WORKED is required when CALC_BASIS is 'DAY'.");
//     }
//     daysWorked = Number(data.DAYS_WORKED);
//   } else {
//     if (data.ENTRY_MODE === "TIME") {
//       if (!data.START_TIME || !data.END_TIME) {
//         throw new Error("START_TIME and END_TIME are required when ENTRY_MODE is 'TIME'.");
//       }
//       startTime = data.START_TIME;
//       endTime = data.END_TIME;
//       hoursWorked = calcHours(startTime, endTime);
//     } else {
//       if (data.HOURS_WORKED == null) {
//         throw new Error("HOURS_WORKED is required when ENTRY_MODE is 'HOURS'.");
//       }
//       hoursWorked = Number(data.HOURS_WORKED);
//     }
//   }

//   return { hoursWorked, daysWorked, startTime, endTime };
// }


function validateAndPrepare(data) {
  if (!["HOUR", "DAY"].includes(data.CALC_BASIS)) {
    throw new Error("CALC_BASIS must be 'HOUR' or 'DAY'.");
  }

  let hoursWorked = null;
  let daysWorked = null;
  let startTime = null;
  let endTime = null;

  if (data.CALC_BASIS === "DAY") {
    if (data.DAYS_WORKED == null) {
      throw new Error("DAYS_WORKED is required when CALC_BASIS is 'DAY'.");
    }
    daysWorked = Number(data.DAYS_WORKED);
  } else {
    if (!["TIME", "HOURS"].includes(data.ENTRY_MODE)) {
      throw new Error("ENTRY_MODE must be 'TIME' or 'HOURS'.");
    }
    if (data.ENTRY_MODE === "TIME") {
      if (!data.START_TIME || !data.END_TIME) {
        throw new Error("START_TIME and END_TIME are required when ENTRY_MODE is 'TIME'.");
      }
      startTime = data.START_TIME;
      endTime = data.END_TIME;
      hoursWorked = calcHours(startTime, endTime);
    } else {
      if (data.HOURS_WORKED == null) {
        throw new Error("HOURS_WORKED is required when ENTRY_MODE is 'HOURS'.");
      }
      hoursWorked = Number(data.HOURS_WORKED);
    }
  }

  return { hoursWorked, daysWorked, startTime, endTime };
}
// ─────────────────────────────────────────────
// INSERT ATTENDANCE
// ─────────────────────────────────────────────
export async function insertAttendance(data) {
  const connection = await getConnection();
  try {
    const { hoursWorked, daysWorked, startTime, endTime } = validateAndPrepare(data);
    
    const attendanceDate = data.ATTENDANCE_DATE ? new Date(data.ATTENDANCE_DATE) : new Date();

    const result = await connection.execute(
      `INSERT INTO PM.PM_WORKER_ATTENDANCE
       (WORKER_ID, PROJECT_ID, ATTENDANCE_DATE, ENTRY_MODE, START_TIME, END_TIME, 
        CALC_BASIS, HOURS_WORKED, DAYS_WORKED, REMARKS, CREATED_BY)
       VALUES
       (:WORKER_ID, :PROJECT_ID, :ATTENDANCE_DATE, :ENTRY_MODE, :START_TIME, :END_TIME, 
        :CALC_BASIS, :HOURS_WORKED, :DAYS_WORKED, :REMARKS, :CREATED_BY)
       RETURNING ATTENDANCE_ID INTO :NEW_ID`,
      {
        WORKER_ID:       Number(data.WORKER_ID),
        PROJECT_ID:      Number(data.PROJECT_ID),
        ATTENDANCE_DATE: attendanceDate,
        ENTRY_MODE:      data.ENTRY_MODE,
        START_TIME:      startTime,
        END_TIME:        endTime,
        CALC_BASIS:      data.CALC_BASIS,
        HOURS_WORKED:    hoursWorked,
        DAYS_WORKED:     daysWorked,
        REMARKS:         data.REMARKS ?? null,
        CREATED_BY:      data.CREATED_BY ?? null,
        NEW_ID:          { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const ATTENDANCE_ID = result.outBinds.NEW_ID[0];
    await connection.commit();
    return ATTENDANCE_ID;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// SEARCH / LIST ATTENDANCE (Paginated)
// ─────────────────────────────────────────────
export async function searchAttendance(filters) {
  const connection = await getConnection();
  try {
    const whereClauses = [];
    const binds = {};

    if (filters.WORKER_ID) {
      whereClauses.push("WORKER_ID = :worker_id");
      binds.worker_id = Number(filters.WORKER_ID);
    }
    if (filters.PROJECT_ID) {
      whereClauses.push("PROJECT_ID = :project_id");
      binds.project_id = Number(filters.PROJECT_ID);
    }
    if (filters.FROM_DATE) {
      whereClauses.push("ATTENDANCE_DATE >= TRUNC(:from_date)");
      binds.from_date = new Date(filters.FROM_DATE);
    }
    if (filters.TO_DATE) {
      whereClauses.push("ATTENDANCE_DATE <= TRUNC(:to_date)");
      binds.to_date = new Date(filters.TO_DATE);
    }

    const whereStr = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // 1. Get total count
    const countSql = `SELECT COUNT(*) AS TOTAL FROM PM.PM_WORKER_ATTENDANCE ${whereStr}`;
    const countRes = await connection.execute(countSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const total = countRes.rows[0].TOTAL;

    // 2. Get paginated data
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.max(1, Number(filters.limit || 20));
    const offset = (page - 1) * limit;

    binds.limit = limit;
    binds.offset = offset;

    const dataSql = `
      SELECT 
        ATTENDANCE_ID, WORKER_ID, PROJECT_ID,
        TO_CHAR(ATTENDANCE_DATE, 'YYYY-MM-DD') AS ATTENDANCE_DATE,
        ENTRY_MODE, START_TIME, END_TIME, CALC_BASIS,
        HOURS_WORKED, DAYS_WORKED, REMARKS, CREATED_BY,
        TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE
      FROM PM.PM_WORKER_ATTENDANCE
      ${whereStr}
      ORDER BY ATTENDANCE_DATE DESC, ATTENDANCE_ID DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const dataRes = await connection.execute(dataSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    
    return {
      total,
      page,
      limit,
      data: dataRes.rows || [],
    };
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// UPDATE ATTENDANCE (Partial Update)
// ─────────────────────────────────────────────
export async function updateAttendance(data) {
  const connection = await getConnection();
  try {
    const attendanceId = Number(data.ATTENDANCE_ID);
    if (!attendanceId) throw new Error("ATTENDANCE_ID is required for update.");

    // 1. Fetch existing record
    const existingRes = await connection.execute(
      `SELECT * FROM PM.PM_WORKER_ATTENDANCE WHERE ATTENDANCE_ID = :id`,
      { id: attendanceId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const existing = existingRes.rows?.[0];
    if (!existing) return 0;

    // 2. Merge existing with new data
    const merged = { ...existing, ...data };

    // 3. Check if we need to recalculate time/hours
    const timeCalcFields = ["ENTRY_MODE", "START_TIME", "END_TIME", "CALC_BASIS", "HOURS_WORKED", "DAYS_WORKED"];
    const needsRecalc = timeCalcFields.some(f => Object.prototype.hasOwnProperty.call(data, f));

    let hoursWorked = existing.HOURS_WORKED;
    let daysWorked = existing.DAYS_WORKED;
    let startTime = existing.START_TIME;
    let endTime = existing.END_TIME;

    if (needsRecalc) {
      const validated = validateAndPrepare(merged);
      hoursWorked = validated.hoursWorked;
      daysWorked = validated.daysWorked;
      startTime = validated.startTime;
      endTime = validated.endTime;
    }

    // 4. Build SET clause dynamically
    const set = [];
    const binds = { attendance_id_bv: attendanceId };

    const simpleFields = ["WORKER_ID", "PROJECT_ID", "REMARKS"];
    for (const field of simpleFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        const key = field.toLowerCase();
        set.push(`${field} = :${key}`);
        binds[key] = field === "REMARKS" ? (data[field] ?? null) : Number(data[field]);
      }
    }

    if (Object.prototype.hasOwnProperty.call(data, "ATTENDANCE_DATE")) {
      set.push("ATTENDANCE_DATE = :attendance_date");
      binds.attendance_date = data.ATTENDANCE_DATE ? new Date(data.ATTENDANCE_DATE) : null;
    }

    if (needsRecalc) {
      set.push("ENTRY_MODE   = :entry_mode");
      set.push("START_TIME   = :start_time");
      set.push("END_TIME     = :end_time");
      set.push("CALC_BASIS   = :calc_basis");
      set.push("HOURS_WORKED = :hours_worked");
      set.push("DAYS_WORKED  = :days_worked");

      binds.entry_mode   = merged.ENTRY_MODE;
      binds.start_time   = startTime;
      binds.end_time     = endTime;
      binds.calc_basis   = merged.CALC_BASIS;
      binds.hours_worked = hoursWorked;
      binds.days_worked  = daysWorked;
    }

    if (set.length === 0) return 0;

    const sql = `UPDATE PM.PM_WORKER_ATTENDANCE SET ${set.join(", ")} WHERE ATTENDANCE_ID = :attendance_id_bv`;
    const result = await connection.execute(sql, binds, { autoCommit: false });

    await connection.commit();
    return result.rowsAffected;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// DELETE ATTENDANCE
// ─────────────────────────────────────────────
export async function deleteAttendance(attendance_id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `DELETE FROM PM.PM_WORKER_ATTENDANCE WHERE ATTENDANCE_ID = :id`,
      { id: Number(attendance_id) },
      { autoCommit: false }
    );
    await connection.commit();
    return result.rowsAffected;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// PAYROLL REPORT
// ─────────────────────────────────────────────
export async function getPayrollReport(workerId, fromDate, toDate) {
  const connection = await getConnection();
  try {
    const sql = `
      SELECT 
        a.ATTENDANCE_ID, 
        TO_CHAR(a.ATTENDANCE_DATE, 'YYYY-MM-DD') AS ATTENDANCE_DATE,
        a.PROJECT_ID, a.CALC_BASIS, a.HOURS_WORKED, a.DAYS_WORKED,
        r.RATE_ID, r.RATE_PER_HOUR, r.RATE_PER_DAY,
        CASE 
          WHEN a.CALC_BASIS = 'HOUR' THEN a.HOURS_WORKED * r.RATE_PER_HOUR
          WHEN a.CALC_BASIS = 'DAY'  THEN a.DAYS_WORKED * r.RATE_PER_DAY
          ELSE NULL
        END AS CALCULATED_AMOUNT
      FROM PM.PM_WORKER_ATTENDANCE a
      LEFT JOIN PM.PM_WORKER_RATE_HISTORY r 
        ON a.WORKER_ID = r.WORKER_ID 
        AND a.ATTENDANCE_DATE BETWEEN r.EFFECTIVE_FROM AND NVL(r.EFFECTIVE_TO, a.ATTENDANCE_DATE)
      WHERE a.WORKER_ID = :wid
        AND a.ATTENDANCE_DATE BETWEEN TRUNC(:from_date) AND TRUNC(:to_date)
      ORDER BY a.ATTENDANCE_DATE ASC, a.ATTENDANCE_ID ASC
    `;

    const result = await connection.execute(
      sql,
      {
        wid:       Number(workerId),
        from_date: new Date(fromDate),
        to_date:   new Date(toDate),
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows || [];
  } finally {
    await connection.close();
  }
}



// ─────────────────────────────────────────────
// GET SINGLE ATTENDANCE BY ID
// ─────────────────────────────────────────────
export async function getAttendanceById(attendance_id) {
  const connection = await getConnection();
  try {
    const sql = `
      SELECT 
        ATTENDANCE_ID, WORKER_ID, PROJECT_ID,
        TO_CHAR(ATTENDANCE_DATE, 'YYYY-MM-DD') AS ATTENDANCE_DATE,
        ENTRY_MODE, START_TIME, END_TIME, CALC_BASIS,
        HOURS_WORKED, DAYS_WORKED, REMARKS, CREATED_BY,
        TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE
      FROM PM.PM_WORKER_ATTENDANCE
      WHERE ATTENDANCE_ID = :id`;

    const result = await connection.execute(
      sql,
      { id: Number(attendance_id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows?.[0] || null;
  } finally {
    await connection.close();
  }
}