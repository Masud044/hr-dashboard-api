// import {
//   createConstructionProcess,
//   readConstructionProcess,
//   updateConstructionProcess,
//   deleteConstructionProcess,
//   getContractorTypes,
//   getContractorsByType,
// } from "./service.js";

import {
  createConstructionProcess,
  readConstructionProcess,
  updateConstructionProcess,
  deleteConstructionProcess,
  getContractorTypes,
  getContractorsByType,
  updateConstructionProcessStatus,
  ALLOWED_STATUS,
} from "./service.js";

export async function handleConstructionProcess(req, res) {
  const action = req.query.action ?? req.body?.action ?? "";

  if (action === "create") {
    const success = await createConstructionProcess(req.body || {});
    return res.json({
      success: success ? 1 : 0,
      message: success ? "Record inserted successfully" : "Insert failed",
    });
  }

  if (action === "read") {
    const processId = Number(req.body?.PROCESS_ID ?? req.query.PROCESS_ID ?? 0);
    const data = await readConstructionProcess(processId);
    return res.json({ success: 1, data });
  }

  if (action === "update") {
    const success = await updateConstructionProcess(req.body || {});
    return res.json({
      success: success ? 1 : 0,
      message: success ? "Record updated successfully" : "Update failed",
    });
  }

  if (action === "delete") {
    const success = await deleteConstructionProcess(req.body?.ID);
    return res.json({
      success: success ? 1 : 0,
      message: success ? "Record deleted successfully" : "Delete failed",
    });
  }

    if (action === "update_status") {
    const ID     = Number(req.body?.ID);
    const STATUS = String(req.body?.STATUS ?? "").toUpperCase();
    const userId = Number(req.body?.UPDATED_BY) || null;

    if (!ID) {
      return res.status(400).json({ success: 0, message: "ID is required" });
    }
    if (!ALLOWED_STATUS.includes(STATUS)) {
      return res.status(400).json({
        success: 0,
        message: `Invalid STATUS. Use: ${ALLOWED_STATUS.join(" | ")}`,
      });
    }

    const success = await updateConstructionProcessStatus({ ID, STATUS, userId });
    if (!success) {
      return res.status(404).json({ success: 0, message: "Process line not found" });
    }
    return res.json({ success: 1, message: "Status updated successfully" });
  }

  // ── Contractor Type dropdown ──────────────────────────────────────────────
  if (action === "contractor_types") {
    const data = await getContractorTypes();
    return res.json({ success: 1, data });
  }

  // ── Contractors filtered by type ──────────────────────────────────────────
  if (action === "contractors_by_type") {
    const typeId = Number(req.body?.TYPE_ID ?? req.query.TYPE_ID ?? 0);
    if (!typeId) {
      return res.json({ success: 0, message: "TYPE_ID is required" });
    }
    const data = await getContractorsByType(typeId);
    return res.json({ success: 1, data });
  }

  return res.json({
    success: 0,
    message: "Invalid action. Use: create | read | update | delete | contractor_types | contractors_by_type",
  });
}