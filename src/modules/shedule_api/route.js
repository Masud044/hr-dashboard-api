import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { runSheduleApi } from "./controller.js";

const router = Router();

router.post("/", asyncHandler(runSheduleApi));

export default router;
