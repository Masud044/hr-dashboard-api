// src/modules/worker-rate/controller.js
import {
  setWorkerRate,
  getWorkerRateHistory,
  getCurrentWorkerRate,
  deleteCurrentWorkerRate,
} from "./service.js";

// ─────────────────────────────────────────────
// SET NEW RATE HANDLER
// POST /worker-rate
// ─────────────────────────────────────────────
export async function handleSetRate(req, res) {
  const body = req.body;

  if (!body?.WORKER_ID || !body?.EFFECTIVE_FROM) {
    return res.status(400).json({
      success: false,
      message: "WORKER_ID and EFFECTIVE_FROM are required.",
    });
  }

  if (body.RATE_PER_HOUR == null && body.RATE_PER_DAY == null) {
    return res.status(400).json({
      success: false,
      message: "At least one of RATE_PER_HOUR or RATE_PER_DAY must be provided.",
    });
  }

  const RATE_ID = await setWorkerRate(body);
  
  return res.status(201).json({ 
    success: true, 
    message: "Worker rate updated successfully.", 
    RATE_ID 
  });
}

// ─────────────────────────────────────────────
// GET RATE HISTORY HANDLER
// GET /worker-rate?worker_id=X
// ─────────────────────────────────────────────
export async function handleGetHistory(req, res) {
  const worker_id = Number(req.query.worker_id || 0);
  
  if (!worker_id) {
    return res.status(400).json({
      success: false,
      message: "worker_id query parameter is required.",
    });
  }

  const data = await getWorkerRateHistory(worker_id);
  
  return res.json({ 
    success: true, 
    count: data.length, 
    data 
  });
}

// ─────────────────────────────────────────────
// GET CURRENT RATE HANDLER
// GET /worker-rate/current?worker_id=X
// ─────────────────────────────────────────────
export async function handleGetCurrentRate(req, res) {
  const worker_id = Number(req.query.worker_id || 0);
  
  if (!worker_id) {
    return res.status(400).json({
      success: false,
      message: "worker_id query parameter is required.",
    });
  }

  const data = await getCurrentWorkerRate(worker_id);
  
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `No current active rate found for worker ID ${worker_id}.`,
    });
  }

  return res.json({ 
    success: true, 
    data 
  });
}



// ─────────────────────────────────────────────
// DELETE CURRENT RATE HANDLER
// DELETE /worker-rate/current?worker_id=X
// ─────────────────────────────────────────────
export async function handleDeleteCurrentRate(req, res) {
  const worker_id = Number(req.query.worker_id || 0);

  if (!worker_id) {
    return res.status(400).json({
      success: false,
      message: "worker_id query parameter is required.",
    });
  }

  const result = await deleteCurrentWorkerRate(worker_id);

  return res.json({
    success: true,
    message: "Current rate deleted successfully.",
    ...result,
  });
}