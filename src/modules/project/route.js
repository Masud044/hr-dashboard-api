import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleProject, handleDocDownload } from "./controller.js";

const router = Router();

// Project CRUD — multipart/form-data support আছে (multer controller এর ভেতরে)
router.get("/",         asyncHandler(handleProject));
router.post("/",        asyncHandler(handleProject));
router.put("/",         asyncHandler(handleProject));
router.delete("/",      asyncHandler(handleProject));

// File download — GET /project/doc/123
router.get("/doc/:id",  asyncHandler(handleDocDownload));

export default router;