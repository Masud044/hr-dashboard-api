import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  handleCreateInvoice,
  handleListInvoices,
  handleGetInvoice,
  handleGetReceipt,
  handleUpdateInvoice,
  handleDeleteInvoice,
} from "./controller.js";

const router = Router();

router.post("/", asyncHandler(handleCreateInvoice));
router.get("/", asyncHandler(handleListInvoices));
router.get("/:id", asyncHandler(handleGetInvoice));
router.get("/:id/receipt", asyncHandler(handleGetReceipt));
router.put("/:id", asyncHandler(handleUpdateInvoice));
router.delete("/:id", asyncHandler(handleDeleteInvoice));

export default router;
