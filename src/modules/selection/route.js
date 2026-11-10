// src/modules/selection/route.js
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  handleListForms,
  handleCreateForm,
  handleGetForm,
  handleUpdateForm,
  handleDeleteForm,
  handleCreateArea,
  handleUpdateArea,
  handleDeleteArea,
  handleCreateItem,
  handleUpdateItem,
  handleDeleteItem,
  handleUploadFile,
  handleFileDownload,
  handleDeleteFile,
  handleCopyForm,
  handleCopyArea,
  handlePublishForm,
  handleReopenForm,
  handleConfirmItem,
  handleConfirmAll,
  guardOwnerWrite,
} from "./controller.js";

const router = Router();

// Forms — collection
router.get("/", asyncHandler(handleListForms));
router.post("/", guardOwnerWrite, asyncHandler(handleCreateForm));

// Areas, items and files — declared before "/:id" so they are not swallowed.
router.post(
  "/areas/:areaId/copy",
  guardOwnerWrite,
  asyncHandler(handleCopyArea),
);
router.put("/areas/:areaId", guardOwnerWrite, asyncHandler(handleUpdateArea));
router.delete(
  "/areas/:areaId",
  guardOwnerWrite,
  asyncHandler(handleDeleteArea),
);

router.post(
  "/areas/:areaId/items",
  guardOwnerWrite,
  asyncHandler(handleCreateItem),
);

router.put("/items/:itemId/confirm", asyncHandler(handleConfirmItem));
router.put("/items/:itemId", guardOwnerWrite, asyncHandler(handleUpdateItem));
router.delete(
  "/items/:itemId",
  guardOwnerWrite,
  asyncHandler(handleDeleteItem),
);

router.post(
  "/items/:itemId/files",
  guardOwnerWrite,
  asyncHandler(handleUploadFile),
);

router.get("/files/:fileId", asyncHandler(handleFileDownload));
router.delete(
  "/files/:fileId",
  guardOwnerWrite,
  asyncHandler(handleDeleteFile),
);

router.post("/:id/areas", guardOwnerWrite, asyncHandler(handleCreateArea));

// Form actions
router.post("/:id/copy", guardOwnerWrite, asyncHandler(handleCopyForm));
router.post("/:id/publish", guardOwnerWrite, asyncHandler(handlePublishForm));
router.post("/:id/reopen", guardOwnerWrite, asyncHandler(handleReopenForm));
router.post("/:id/confirm-all", asyncHandler(handleConfirmAll));

// Form — single record
router.get("/:id", asyncHandler(handleGetForm));
router.put("/:id", guardOwnerWrite, asyncHandler(handleUpdateForm));
router.delete("/:id", guardOwnerWrite, asyncHandler(handleDeleteForm));

export default router;
