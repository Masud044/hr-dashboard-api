import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleGantt } from "./controller.js";

const router = Router();

router.get("/", asyncHandler(handleGantt));
router.post("/", asyncHandler(handleGantt));
router.put("/", asyncHandler(handleGantt));
router.delete("/", asyncHandler(handleGantt));

export default router;
