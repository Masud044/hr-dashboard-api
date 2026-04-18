import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getCalendar } from "./controller.js";

const router = Router();

router.get("/", asyncHandler(getCalendar));

export default router;
