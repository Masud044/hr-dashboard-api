import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

function normalizeRows(rows) {
  return (rows || []).map((row) => {
    const normalized = {};
    for (const key of Object.keys(row)) {
      normalized[key.toLowerCase()] = row[key];
    }
    return normalized;
  });
}

export async function fetchCalendarRecords({ day_id, month_id, day }) {
  const connection = await getConnection();
  try {
    let sql = `SELECT
      DAY_ID,
      TO_CHAR(DAY, 'YYYY-MM-DD') AS DAY,
      HOLIDAY_DESCRIPTION,
      WORKING_STATUS,
      LAST_UPDATED_BY,
      TO_CHAR(LAST_UPDATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS LAST_UPDATED_DATE,
      MONTH_ID,
      DAY_NAME
    FROM PM_CALENDAR_T
    WHERE 1=1`;

    const binds = {};
    if (day_id) {
      sql += " AND DAY_ID = :day_id";
      binds.day_id = day_id;
    }
    if (month_id) {
      sql += " AND MONTH_ID = :month_id";
      binds.month_id = month_id;
    }
    if (day) {
      sql += " AND TRUNC(DAY) = TO_DATE(:day, 'YYYY-MM-DD')";
      binds.day = day;
    }
    sql += " ORDER BY DAY ASC";

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    return normalizeRows(result.rows);
  } finally {
    await connection.close();
  }
}
