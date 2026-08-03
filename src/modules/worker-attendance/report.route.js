// src\modules\worker-attendance\report.route.js
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleDailyMoneyReport } from "./report.controller.js";

const router = Router();

router.get("/reports/daily", asyncHandler(handleDailyMoneyReport));

export default router;