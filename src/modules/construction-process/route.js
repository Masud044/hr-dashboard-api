import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleConstructionProcess } from "./controller.js";

const router = Router();

router.get("/", asyncHandler(handleConstructionProcess));
router.post("/", asyncHandler(handleConstructionProcess));
router.put("/", asyncHandler(handleConstructionProcess));
router.delete("/", asyncHandler(handleConstructionProcess));

export default router;