import { Router } from "express";
import {
  getAll,
  getById,
  create,
  bulkCreate,
  update,
  patchStatus,
  remove,
} from "./controller.js";

const router = Router();

// GET    /api/calendar              → all days  (optional ?monthId=N)
router.get("/", getAll);

// GET    /api/calendar/:id          → single day
router.get("/:id", getById);

// POST   /api/calendar              → create one day
router.post("/", create);

// POST   /api/calendar/bulk         → create many days at once
router.post("/bulk", bulkCreate);

// PUT    /api/calendar/:id          → full update
router.put("/:id", update);

// PATCH  /api/calendar/:id/status   → update working status only
router.patch("/:id/status", patchStatus);

// DELETE /api/calendar/:id          → delete
router.delete("/:id", remove);

export default router;