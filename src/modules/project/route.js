import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleProject } from "./controller.js";

const router = Router();
router.get("/", asyncHandler(handleProject));
router.post("/", asyncHandler(handleProject));
router.put("/", asyncHandler(handleProject));
router.delete("/", asyncHandler(handleProject));

export default router;
