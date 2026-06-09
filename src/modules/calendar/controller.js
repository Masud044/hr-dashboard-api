import {
  getAllCalendarDays,
  getCalendarDayById,
  createCalendarDay,
  updateCalendarDay,
  patchWorkingStatus,
  deleteCalendarDay,
  bulkCreateCalendarDays,
} from "./service.js";

// ─── GET ALL  /api/calendar  or  /api/calendar?monthId=3 ──────────────────────
export async function getAll(req, res, next) {
  try {
    const { monthId } = req.query;
    const data = await getAllCalendarDays({ monthId });
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─── GET BY ID  /api/calendar/:id ─────────────────────────────────────────────
export async function getById(req, res, next) {
  try {
    const record = await getCalendarDayById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Calendar day not found" });
    }
    return res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

// ─── CREATE  POST /api/calendar ───────────────────────────────────────────────
export async function create(req, res, next) {
  try {
    const {
      day,
      holidayDescription,
      workingStatus,
      lastUpdatedBy,
      monthId,
      dayName,
    } = req.body;

    if (!day) {
      return res.status(400).json({ success: false, message: "Field 'day' is required (YYYY-MM-DD)" });
    }

    const created = await createCalendarDay({
      day,
      holidayDescription,
      workingStatus,
      lastUpdatedBy,
      monthId,
      dayName,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

// ─── BULK CREATE  POST /api/calendar/bulk ─────────────────────────────────────
export async function bulkCreate(req, res, next) {
  try {
    const { days } = req.body;

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ success: false, message: "'days' must be a non-empty array" });
    }

    const result = await bulkCreateCalendarDays(days);
    return res.status(201).json({ success: true, data: result, count: result.length });
  } catch (err) {
    next(err);
  }
}

// ─── UPDATE  PUT /api/calendar/:id ────────────────────────────────────────────
export async function update(req, res, next) {
  try {
    const {
      day,
      holidayDescription,
      workingStatus,
      lastUpdatedBy,
      monthId,
      dayName,
    } = req.body;

    if (!day) {
      return res.status(400).json({ success: false, message: "Field 'day' is required (YYYY-MM-DD)" });
    }

    const updated = await updateCalendarDay(req.params.id, {
      day,
      holidayDescription,
      workingStatus,
      lastUpdatedBy,
      monthId,
      dayName,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Calendar day not found" });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH WORKING STATUS  PATCH /api/calendar/:id/status ────────────────────
export async function patchStatus(req, res, next) {
  try {
    const { workingStatus, lastUpdatedBy } = req.body;

    if (!workingStatus) {
      return res.status(400).json({ success: false, message: "'workingStatus' is required" });
    }

    const updated = await patchWorkingStatus(req.params.id, workingStatus, lastUpdatedBy);

    if (!updated) {
      return res.status(404).json({ success: false, message: "Calendar day not found" });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE  DELETE /api/calendar/:id ─────────────────────────────────────────
export async function remove(req, res, next) {
  try {
    const deleted = await deleteCalendarDay(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Calendar day not found" });
    }

    return res.json({ success: true, data: deleted, message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
}