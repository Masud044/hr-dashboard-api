// src\modules\worker-attendance\report.service.js

import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function getDailyMoneyReport(filters) {
  const connection = await getConnection();
  try {
    const whereClauses = ["a.ATTENDANCE_DATE BETWEEN TRUNC(:from_date) AND TRUNC(:to_date)"];
    const binds = {
      from_date: new Date(filters.FROM_DATE),
      to_date: new Date(filters.TO_DATE),
    };

    if (filters.WORKER_ID) {
      whereClauses.push("a.WORKER_ID = :worker_id");
      binds.worker_id = Number(filters.WORKER_ID);
    }
    if (filters.PROJECT_ID) {
      whereClauses.push("a.PROJECT_ID = :project_id");
      binds.project_id = Number(filters.PROJECT_ID);
    }

    const whereStr = whereClauses.join(" AND ");

    const detailSql = `
      SELECT
        a.ATTENDANCE_ID,
        a.WORKER_ID,
        w.WORKER_NAME,
        a.PROJECT_ID,
        TO_CHAR(a.ATTENDANCE_DATE, 'YYYY-MM-DD') AS ATTENDANCE_DATE,
        a.CALC_BASIS, a.HOURS_WORKED, a.DAYS_WORKED,
        r.RATE_PER_HOUR, r.RATE_PER_DAY,
        CASE
          WHEN a.CALC_BASIS = 'HOUR' THEN a.HOURS_WORKED * NVL(r.RATE_PER_HOUR, 0)
          WHEN a.CALC_BASIS = 'DAY'  THEN a.DAYS_WORKED  * NVL(r.RATE_PER_DAY, 0)
          ELSE 0
        END AS AMOUNT
      FROM PM.PM_WORKER_ATTENDANCE a
      JOIN PM.PM_WORKER w ON w.WORKER_ID = a.WORKER_ID
      LEFT JOIN PM.PM_WORKER_RATE_HISTORY r
        ON a.WORKER_ID = r.WORKER_ID
        AND a.ATTENDANCE_DATE BETWEEN r.EFFECTIVE_FROM AND NVL(r.EFFECTIVE_TO, a.ATTENDANCE_DATE)
      WHERE ${whereStr}
      ORDER BY a.ATTENDANCE_DATE ASC, a.WORKER_ID ASC
    `;

    const detailRes = await connection.execute(detailSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const rows = detailRes.rows || [];

    // Aggregated here in JS rather than a second/third round trip — a date-range
    // attendance report is a small enough result set that this is simpler than
    // GROUP BY ROLLUP and easier to reason about.
    const dailyMap = new Map();
    const workerMap = new Map();
    let grandTotal = 0;

    for (const r of rows) {
      const amt = Number(r.AMOUNT || 0);
      grandTotal += amt;

      const d = dailyMap.get(r.ATTENDANCE_DATE) || { ATTENDANCE_DATE: r.ATTENDANCE_DATE, TOTAL_AMOUNT: 0 };
      d.TOTAL_AMOUNT += amt;
      dailyMap.set(r.ATTENDANCE_DATE, d);

      const w = workerMap.get(r.WORKER_ID) || { WORKER_ID: r.WORKER_ID, WORKER_NAME: r.WORKER_NAME, TOTAL_AMOUNT: 0 };
      w.TOTAL_AMOUNT += amt;
      workerMap.set(r.WORKER_ID, w);
    }

    const round2 = n => Math.round(n * 100) / 100;

    return {
      details: rows,
      dailyTotals: [...dailyMap.values()].map(d => ({ ...d, TOTAL_AMOUNT: round2(d.TOTAL_AMOUNT) })),
      workerTotals: [...workerMap.values()].map(w => ({ ...w, TOTAL_AMOUNT: round2(w.TOTAL_AMOUNT) })),
      grandTotal: round2(grandTotal),
    };
  } finally {
    await connection.close();
  }
}