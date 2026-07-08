// src\modules\worker-attendance\report.controller.js
import { getDailyMoneyReport } from "./report.service.js";

export async function handleDailyMoneyReport(req, res) {
  const { from_date, to_date, worker_id, project_id } = req.query;

  if (!from_date || !to_date) {
    return res.status(400).json({
      success: false,
      message: "from_date and to_date query parameters are required.",
    });
  }

  const data = await getDailyMoneyReport({
    FROM_DATE: from_date,
    TO_DATE: to_date,
    WORKER_ID: worker_id,
    PROJECT_ID: project_id,
  });

  return res.json({ success: true, ...data });
}