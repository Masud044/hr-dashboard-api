// src/modules/worker-attendance/route.js
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleAttendance, handlePayrollReport } from "./controller.js";

const router = Router();

router.get("/",         asyncHandler(handleAttendance));
router.post("/",        asyncHandler(handleAttendance));
router.put("/",         asyncHandler(handleAttendance));
router.delete("/:id",   asyncHandler(handleAttendance));

router.get("/payroll",  asyncHandler(handlePayrollReport));

export default router;