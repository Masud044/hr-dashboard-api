import { getConnection } from "../../config/db.js";

export async function executeCreateScheduleProcedure({ p_pid, p_s_date }) {
  const connection = await getConnection();
  try {
    try {
      await connection.execute(
        "BEGIN CREATE_SCHEDULE(:p_pid, TO_DATE(:p_s_date, 'YYYY-MM-DD')); END;",
        {
          p_pid,
          p_s_date
        }
      );

      return {
        success: 1,
        message: `Procedure executed successfully for p_pid = ${p_pid}`
      };
    } catch (error) {
      return {
        success: 0,
        message: `Execution failed: ${error.message}`
      };
    }
  } finally {
    await connection.close();
  }
}
