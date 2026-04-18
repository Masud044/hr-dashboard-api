import { AppError } from "../../utils/appError.js";
import { listGantt, createGantt, updateGantt, deleteGantt } from "./service.js";

export async function handleGantt(req, res) {
  if (req.method === "GET") {
    const h_id = req.query.h_id ? Number.parseInt(req.query.h_id, 10) : null;
    const l_id = req.query.l_id ? Number.parseInt(req.query.l_id, 10) : null;
    const data = await listGantt({ h_id, l_id });
    return res.json({ success: true, data });
  }

  if (req.method === "POST") {
    const H_ID = req.body?.H_ID ? Number(req.body.H_ID) : null;
    const C_P_ID = req.body?.C_P_ID ? Number(req.body.C_P_ID) : null;
    const SCHEDULE_START_DATE = req.body?.SCHEDULE_START_DATE ?? null;
    const SCHEDULE_END_DATE = req.body?.SCHEDULE_END_DATE ?? null;

    if (!H_ID || !C_P_ID || !SCHEDULE_START_DATE || !SCHEDULE_END_DATE) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields (H_ID, C_P_ID, SCHEDULE_START_DATE, SCHEDULE_END_DATE)"
      });
    }

    const result = await createGantt(req.body);
    return res.status(201).json(result);
  }

  if (req.method === "PUT") {
    const L_ID = req.body?.L_ID ? Number(req.body.L_ID) : null;
    if (!L_ID) {
      return res.status(400).json({ success: false, message: "L_ID required" });
    }
    const result = await updateGantt(req.body);
    if (!result.success && result.message === "No fields provided to update") {
      return res.status(400).json(result);
    }
    return res.json(result);
  }

  if (req.method === "DELETE") {
    const L_ID = req.body?.L_ID ? Number(req.body.L_ID) : null;
    if (!L_ID) {
      return res.status(400).json({ success: false, message: "L_ID required" });
    }
    const result = await deleteGantt(req.body);
    return res.json(result);
  }

  throw new AppError("Method not supported", 405, { success: false, message: "Method not supported" });
}
