// src/modules/worker-rate/route.js
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { 
  handleSetRate, 
  handleGetHistory, 
  handleGetCurrentRate 
} from "./controller.js";

const router = Router();

router.post("/",            asyncHandler(handleSetRate));
router.get("/",             asyncHandler(handleGetHistory));
router.get("/current",      asyncHandler(handleGetCurrentRate));

export default router;