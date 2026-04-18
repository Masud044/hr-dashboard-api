import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleSupplier } from "./controller.js";

const router = Router();
router.get("/", asyncHandler(handleSupplier));
router.post("/", asyncHandler(handleSupplier));
router.put("/", asyncHandler(handleSupplier));
router.delete("/", asyncHandler(handleSupplier));

export default router;
