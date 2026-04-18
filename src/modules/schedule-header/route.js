import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleScheduleHeader } from "./controller.js";

const router = Router();
router.get("/", asyncHandler(handleScheduleHeader));
router.put("/", asyncHandler(handleScheduleHeader));

export default router;
