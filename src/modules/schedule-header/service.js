import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function getScheduleHeader(hid) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT H.H_ID, P.P_NAME, H.DESCRIPTION, H.PROJECT_START_PLAN, H.PROJECT_END_PLAN
       FROM PM_SCHEDUL_H H JOIN PM_PROJECT P ON H.P_ID = P.P_ID WHERE H.H_ID = :hid`,
      { hid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows?.[0] || null;
  } finally {
    await connection.close();
  }
}

export async function updateScheduleHeader(data) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `UPDATE PM_SCHEDUL_H
       SET DESCRIPTION = :description, UPDATED_DATE = SYSDATE,
           PROJECT_START_PLAN = CASE WHEN :s_val IS NULL THEN NULL ELSE TO_DATE(:s_val,'DD-MON-YYYY') END,
           PROJECT_END_PLAN = CASE WHEN :e_val IS NULL THEN NULL ELSE TO_DATE(:e_val,'DD-MON-YYYY') END
       WHERE H_ID = :h_id`,
      {
        description: data.description,
        s_val: data.project_start_plan ? new Date(data.project_start_plan).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-").toUpperCase() : null,
        e_val: data.project_end_plan ? new Date(data.project_end_plan).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-").toUpperCase() : null,
        h_id: data.h_id
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await connection.close();
  }
}
