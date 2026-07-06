// src/modules/worker-attendance/controller.js
import {
  insertAttendance,
  searchAttendance,
  updateAttendance,
  deleteAttendance,
  getPayrollReport,
} from "./service.js";

// ─────────────────────────────────────────────
// MAIN ATTENDANCE HANDLER (CRUD)
// ─────────────────────────────────────────────
export async function handleAttendance(req, res) {
  // ── POST ─────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body;
    if (!body?.WORKER_ID || !body?.PROJECT_ID || !body?.ENTRY_MODE || !body?.CALC_BASIS) {
      return res.status(400).json({
        success: false,
        message: "WORKER_ID, PROJECT_ID, ENTRY_MODE, and CALC_BASIS are required.",
      });
    }

    const ATTENDANCE_ID = await insertAttendance(body);
    return res.status(201).json({ 
      success: true, 
      message: "Attendance recorded successfully.", 
      ATTENDANCE_ID 
    });
  }

  // ── GET ──────────────────────────────────────
  if (req.method === "GET") {
    const data = await searchAttendance(req.query);
    return res.json({ 
      success: true, 
      ...data 
    });
  }

  // ── PUT ──────────────────────────────────────
  if (req.method === "PUT") {
    const body = req.body;
    if (!body?.ATTENDANCE_ID) {
      return res.status(400).json({
        success: false,
        message: "ATTENDANCE_ID is required for update.",
      });
    }

    const rows = await updateAttendance(body);
    if (!rows) {
      return res.status(404).json({
        success: false,
        message: `Attendance with ID ${body.ATTENDANCE_ID} not found or no changes made.`,
      });
    }
    return res.json({
      success: true,
      message: `Attendance ${body.ATTENDANCE_ID} updated successfully.`,
    });
  }

  // ── DELETE ───────────────────────────────────
  if (req.method === "DELETE") {
    const attendance_id = Number(req.params.id || 0);
    if (!attendance_id || attendance_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid attendance ID is required for deletion.",
      });
    }
    
    const rows = await deleteAttendance(attendance_id);
    if (!rows) {
      return res.status(404).json({
        success: false,
        message: `Attendance with ID ${attendance_id} not found.`,
      });
    }
    return res.json({
      success: true,
      message: `Attendance ${attendance_id} deleted successfully.`,
    });
  }

  return res.status(405).json({ success: false, message: "Method not supported." });
}

// ─────────────────────────────────────────────
// PAYROLL REPORT HANDLER
// GET /worker-attendance/payroll
// ─────────────────────────────────────────────
export async function handlePayrollReport(req, res) {
  const { worker_id, from_date, to_date } = req.query;

  if (!worker_id || !from_date || !to_date) {
    return res.status(400).json({
      success: false,
      message: "worker_id, from_date, and to_date query parameters are required.",
    });
  }

  const data = await getPayrollReport(worker_id, from_date, to_date);
  
  return res.json({
    success: true,
    count: data.length,
    data,
  });
}