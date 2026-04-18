import { executeCreateScheduleProcedure } from "./service.js";

export async function runSheduleApi(req, res) {
  const input = req.body || {};

  if (
    !Object.prototype.hasOwnProperty.call(input, "p_pid") ||
    !Object.prototype.hasOwnProperty.call(input, "p_s_date")
  ) {
    return res.json({
      success: 0,
      message: "Missing required fields: p_pid or p_s_date"
    });
  }

  const p_pid = Number.parseInt(input.p_pid, 10);
  const p_s_date = input.p_s_date;

  try {
    const result = await executeCreateScheduleProcedure({ p_pid, p_s_date });
    return res.json(result);
  } catch (error) {
    return res.json({
      success: 0,
      message: `Exception: ${error.message}`
    });
  }
}
