import { getScheduleHeader, updateScheduleHeader } from "./service.js";

export async function handleScheduleHeader(req, res) {
  if (req.method === "GET") {
    const hid = req.query.hid ?? null;
    if (!hid) return res.json({ success: false, message: "Missing parameter: hid" });
    const data = await getScheduleHeader(Number(hid));
    return res.json({ success: true, data });
  }
  if (req.method === "PUT") {
    if (!req.body) return res.json({ success: false, message: "Invalid JSON input" });
    if (!req.body.h_id || !req.body.description) {
      return res.json({ success: false, message: "Required fields: h_id, description" });
    }
    await updateScheduleHeader(req.body);
    return res.json({ success: true, message: "Record updated successfully" });
  }
  return res.json({ success: false, message: "Method not allowed" });
}
