import { fetchCalendarRecords } from "./service.js";

export async function getCalendar(req, res) {
  const day_id = req.query.day_id ? Number.parseInt(req.query.day_id, 10) : null;
  const month_id = req.query.month_id ? Number.parseInt(req.query.month_id, 10) : null;
  const day = req.query.day || null;

  const records = await fetchCalendarRecords({ day_id, month_id, day });
  if (records.length > 0) {
    return res.json({ success: 1, records });
  }

  return res.json({ success: 0, message: "No records found" });
}
