import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ─────────────────────────────────────────────
// OVERVIEW SUMMARY (V1 - Core Metrics + Status Breakdown)
// ─────────────────────────────────────────────
export async function getOverviewSummary() {
  const connection = await getConnection();
  try {
    // 1️⃣ CORE COUNTS (High-level KPI Cards)
    const countsResult = await connection.execute(
      `SELECT 
        (SELECT COUNT(*) FROM PM.PM_PROJECT) AS TOTAL_PROJECTS,
        (SELECT COUNT(*) FROM PM.PM_CONTRACTOR_INFO WHERE STATUS = 1) AS ACTIVE_CONTRACTORS,
        (SELECT COUNT(*) FROM PM.PM_PROJECT WHERE CERT_UPLOAD_STATUS = 'PENDING') AS PENDING_CERTS
       FROM DUAL`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 2️⃣ PROJECTS BY STATUS (For Pie/Donut/Bar Charts)
    // Uses NVL to catch any projects that might have a NULL status
    const statusResult = await connection.execute(
      `SELECT NVL(PROJECT_STATUS, 'UNKNOWN') AS STATUS, COUNT(*) AS COUNT
       FROM PM.PM_PROJECT
       GROUP BY PROJECT_STATUS
       ORDER BY COUNT DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 3️⃣ RECENT PROJECTS (Latest 5)
    const recentProjectsResult = await connection.execute(
      `SELECT P_ID, P_NAME, P_TYPE, STATE, CERT_UPLOAD_STATUS,
              TO_CHAR(CREATION_DATE, 'YYYY-MM-DD') AS CREATION_DATE
       FROM PM.PM_PROJECT
       ORDER BY CREATION_DATE DESC
       FETCH FIRST 5 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 4️⃣ RECENT CONTRACTORS (Latest 5)
    const recentContractorsResult = await connection.execute(
      `SELECT CONTRATOR_ID, CONTRATOR_NAME, CONTACT_PERSON, PHONE, EMAIL, STATUS,
              TO_CHAR(ENTRY_DATE, 'YYYY-MM-DD') AS ENTRY_DATE
       FROM PM.PM_CONTRACTOR_INFO
       ORDER BY ENTRY_DATE DESC
       FETCH FIRST 5 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      counts: countsResult.rows?.[0] || {},
      projectsByStatus: statusResult.rows || [], // ✅ NEW: Breakdown by status
      recentProjects: recentProjectsResult.rows || [],
      recentContractors: recentContractorsResult.rows || [],
    };
  } finally {
    await connection.close();
  }
}