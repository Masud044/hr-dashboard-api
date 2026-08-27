// src/modules/worker-attendance/route.js
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleAttendance, handlePayrollReport, handleGetAttendanceById, handleApproveAttendance, handleDisapproveAttendance} from "./controller.js";
import { protectRouteV2 } from "../auth-v2/auth-v2.middleware.js";

const router = Router();

router.use(protectRouteV2);

router.get("/",         asyncHandler(handleAttendance));
router.post("/",        asyncHandler(handleAttendance));
router.put("/",         asyncHandler(handleAttendance));



router.post("/approve",          asyncHandler(handleApproveAttendance));
router.post("/:id/disapprove",   asyncHandler(handleDisapproveAttendance));
router.delete("/:id",   asyncHandler(handleAttendance));

router.get("/payroll",  asyncHandler(handlePayrollReport));
router.get("/:id",      asyncHandler(handleGetAttendanceById));

export default router;