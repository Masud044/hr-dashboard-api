import express from "express";
import {
  createContractor,
  getAllContractors,
  getContractorById,
  updateContractor,
  deleteContractor,
} from "./controller.js";

const router = express.Router();

// POST   /api/contractors          → Create contractor + types (transaction)
// GET    /api/contractors          → Get all contractors
// GET    /api/contractors/:id      → Get single contractor with its types
// PUT    /api/contractors/:id      → Update contractor + replace types (transaction)
// DELETE /api/contractors/:id      → Delete contractor + types (transaction)

router.post("/",      createContractor);
router.get("/",       getAllContractors);
router.get("/:id",    getContractorById);
router.put("/:id",    updateContractor);
router.delete("/:id", deleteContractor);

export default router;