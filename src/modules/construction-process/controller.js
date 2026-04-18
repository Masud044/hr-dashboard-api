import {
  createConstructionProcess,
  readConstructionProcess,
  updateConstructionProcess,
  deleteConstructionProcess
} from "./service.js";

export async function handleConstructionProcess(req, res) {
  const action = req.query.action ?? req.body?.action ?? "";
  if (action === "create") {
    const success = await createConstructionProcess(req.body || {});
    return res.json({ success: success ? 1 : 0, message: success ? "Record inserted successfully" : "Insert failed" });
  }
  if (action === "read") {
    const processId = Number(req.body?.PROCESS_ID ?? req.query.PROCESS_ID ?? 0);
    const data = await readConstructionProcess(processId);
    return res.json({ success: 1, data });
  }
  if (action === "update") {
    const success = await updateConstructionProcess(req.body || {});
    return res.json({ success: success ? 1 : 0, message: success ? "Record updated successfully" : "Update failed" });
  }
  if (action === "delete") {
    const success = await deleteConstructionProcess(req.body?.ID);
    return res.json({ success: success ? 1 : 0, message: success ? "Record deleted successfully" : "Delete failed" });
  }
  return res.json({ success: 0, message: "Invalid action. Use create, read, update, or delete." });
}

