import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleContractorInfo } from "./controller.js";

const router = Router();
router.get("/", asyncHandler(handleContractorInfo));
router.post("/", asyncHandler(handleContractorInfo));
router.put("/", asyncHandler(handleContractorInfo));
router.delete("/", asyncHandler(handleContractorInfo));

export default router;
