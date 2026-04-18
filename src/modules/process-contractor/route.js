import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createContractorFromProcess } from "./controller.js";

const router = Router();
router.post("/", asyncHandler(createContractorFromProcess));

export default router;
