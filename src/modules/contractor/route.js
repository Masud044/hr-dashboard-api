import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleContractorType } from "./controller.js";

const router = Router();

router.get("/", asyncHandler(handleContractorType));
router.post("/", asyncHandler(handleContractorType));
router.put("/", asyncHandler(handleContractorType));
router.delete("/", asyncHandler(handleContractorType));

export default router;
