import { Router } from "express";
import {
  getAll,
  getById,
  getByContractorId,
  create,
  update,
  remove,
  getContractorTypes,
  getContractors,
} from "./controller.js";

const router = Router();

// ─── Lookup dropdowns ─────────────────────────────────────────────────────────
// GET /api/contractor-type-info/types       → PM_CONTRACTOR_TYPE list
// GET /api/contractor-type-info/contractors → PM_CONTRACTOR_INFO list
router.get("/types", getContractorTypes);
router.get("/contractors", getContractors);

// ─── PM_CONTRACTOR_TYPE_INFO CRUD ─────────────────────────────────────────────
// GET    /api/contractor-type-info
router.get("/", getAll);

// GET    /api/contractor-type-info/:id
router.get("/:id", getById);

// GET    /api/contractor-type-info/by-contractor/:contractorId
router.get("/by-contractor/:contractorId", getByContractorId);

// POST   /api/contractor-type-info
router.post("/", create);

// PUT    /api/contractor-type-info/:id
router.put("/:id", update);

// DELETE /api/contractor-type-info/:id
router.delete("/:id", remove);

export default router;