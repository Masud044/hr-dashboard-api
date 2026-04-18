import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleProjectType } from "./controller.js";

const router = Router();

router.get("/", asyncHandler(handleProjectType));
router.post("/", asyncHandler(handleProjectType));
router.put("/", asyncHandler(handleProjectType));
router.delete("/", asyncHandler(handleProjectType));

export default router;
