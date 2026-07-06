// src/modules/worker/controller.js
import {
  insertWorker,
  searchWorker,
  updateWorker,
  deleteWorker,
} from "./service.js";

// ─────────────────────────────────────────────
// MAIN WORKER HANDLER
// ─────────────────────────────────────────────
export async function handleWorker(req, res) {
  // ── POST ─────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body;
    if (!body?.WORKER_NAME) {
      return res.status(400).json({
        success: false,
        message: "WORKER_NAME is required.",
      });
    }

    const WORKER_ID = await insertWorker(body);
    return res.status(201).json({ success: true, message: "Worker created.", WORKER_ID });
  }

  // ── GET ──────────────────────────────────────
  if (req.method === "GET") {
    const worker_id = Number(req.query.worker_id || 0);
    const data = await searchWorker(worker_id);

    if (worker_id > 0 && !data.length) {
      return res.status(404).json({
        success: false,
        message: `Worker with ID ${worker_id} not found.`,
      });
    }
    return res.json({ success: true, count: data.length, data });
  }

  // ── PUT ──────────────────────────────────────
  if (req.method === "PUT") {
    const body = req.body;
    if (!body?.WORKER_ID) {
      return res.status(400).json({
        success: false,
        message: "WORKER_ID is required for update.",
      });
    }

    const rows = await updateWorker(body);
    if (!rows) {
      return res.status(404).json({
        success: false,
        message: `Worker with ID ${body.WORKER_ID} not found or no changes made.`,
      });
    }
    return res.json({
      success: true,
      message: `Worker ${body.WORKER_ID} updated successfully.`,
    });
  }

  // ── DELETE ───────────────────────────────────
  if (req.method === "DELETE") {
    const worker_id = Number(req.params.id || 0);
    if (!worker_id || worker_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid worker ID is required for deletion.",
      });
    }
    const rows = await deleteWorker(worker_id);
    if (!rows) {
      return res.status(404).json({
        success: false,
        message: `Worker with ID ${worker_id} not found.`,
      });
    }
    return res.json({
      success: true,
      message: `Worker ${worker_id} deleted successfully.`,
    });
  }

  return res.status(405).json({ success: false, message: "Method not supported." });
}