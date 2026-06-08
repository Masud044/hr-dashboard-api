import { Router } from "express";
import {
  getAll,
  getById,
  getByProjectId,
  create,
  update,
  remove,
  getProjects,
} from "./controller.js";

const router = Router();

// ─── Lookup: PM_PROJECT dropdown ─────────────────────────────────────────────
// GET /api/owner-info/projects
router.get("/projects", getProjects);

// ─── PM_OWNER_INFO CRUD ───────────────────────────────────────────────────────
// GET  /api/owner-info
router.get("/", getAll);

// GET  /api/owner-info/:id
router.get("/:id", getById);

// GET  /api/owner-info/by-project/:projectId
router.get("/by-project/:projectId", getByProjectId);

// POST /api/owner-info
router.post("/", create);

// PUT  /api/owner-info/:id
router.put("/:id", update);

// DELETE /api/owner-info/:id
router.delete("/:id", remove);

export default router;