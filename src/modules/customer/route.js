import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleCustomer } from "./controller.js";

const router = Router();
router.get("/", asyncHandler(handleCustomer));
router.post("/", asyncHandler(handleCustomer));
router.put("/", asyncHandler(handleCustomer));
router.delete("/", asyncHandler(handleCustomer));

export default router;
