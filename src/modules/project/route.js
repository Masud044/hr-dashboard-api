// src\modules\project\route.js
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  handleProject,
  handleDocDownload,
  handleCertificateUpload,
  handleNotifyContractors,
  handleMoveProject,
  handleReorderProject,
   handleUpdateProjectStatus,
} from "./controller.js";

const router = Router();

router.get("/",         asyncHandler(handleProject));
router.post("/",        asyncHandler(handleProject));
router.put("/",         asyncHandler(handleProject));
router.delete("/",      asyncHandler(handleProject));

router.get("/doc/:id",  asyncHandler(handleDocDownload));
router.put("/doc/:id/upload", asyncHandler(handleCertificateUpload));

router.post("/notify-bulk", asyncHandler(handleNotifyContractors));

// Reorder — manual sort feature
router.patch("/:id/move",    asyncHandler(handleMoveProject));
router.patch("/:id/reorder", asyncHandler(handleReorderProject));

router.patch("/:id/status",  asyncHandler(handleUpdateProjectStatus));

export default router;