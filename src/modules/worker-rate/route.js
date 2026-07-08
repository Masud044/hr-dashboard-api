// src/modules/worker-rate/route.js
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { 
  handleSetRate, 
  handleGetHistory, 
  handleGetCurrentRate,
  handleDeleteCurrentRate,
} from "./controller.js";


const router = Router();

router.post("/",            asyncHandler(handleSetRate));
router.get("/",             asyncHandler(handleGetHistory));
router.get("/current",      asyncHandler(handleGetCurrentRate));
router.delete("/current", asyncHandler(handleDeleteCurrentRate));

export default router;