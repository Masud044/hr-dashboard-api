import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getSchedule, postSchedule, putSchedule, deleteSchedule } from "./controller.js";

const router = Router();

router.get("/", asyncHandler(getSchedule));
router.post("/", asyncHandler(postSchedule));
router.put("/", asyncHandler(putSchedule));
router.delete("/", asyncHandler(deleteSchedule));

export default router;
