// src/modules/worker/route.js
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleWorker } from "./controller.js";

const router = Router();

router.get("/",         asyncHandler(handleWorker));
router.post("/",        asyncHandler(handleWorker));
router.put("/",         asyncHandler(handleWorker));
router.delete("/:id",   asyncHandler(handleWorker));

export default router;