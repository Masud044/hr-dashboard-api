// src/modules/todo/controller.js
import {
  insertTodo,
  searchTodo,
  updateTodo,
  updateTodoStatus,
  reorderTodos,
  deleteTodo,
} from "./service.js";

const ALLOWED_STATUSES = ["TODO", "DONE", "REVIEWED"];

// ─────────────────────────────────────────────
// MAIN TODO HANDLER
// ─────────────────────────────────────────────
export async function handleTodo(req, res) {
  // ── POST ─────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body;
    if (!body?.TITLE) {
      return res.status(400).json({
        success: false,
        message: "TITLE is required.",
      });
    }

    const TODO_ID = await insertTodo(body);
    return res.status(201).json({ success: true, message: "Todo created.", TODO_ID });
  }

  // ── GET ──────────────────────────────────────
  if (req.method === "GET") {
    const todo_id = Number(req.query.todo_id || 0);
    const status = req.query.status || null;
    const data = await searchTodo(todo_id, status);

    if (todo_id > 0 && !data.length) {
      return res.status(404).json({
        success: false,
        message: `Todo with ID ${todo_id} not found.`,
      });
    }
    return res.json({ success: true, count: data.length, data });
  }

  // ── PUT ──────────────────────────────────────
  if (req.method === "PUT") {
    const body = req.body;
    if (!body?.TODO_ID) {
      return res.status(400).json({
        success: false,
        message: "TODO_ID is required for update.",
      });
    }

    const rows = await updateTodo(body);
    if (!rows) {
      return res.status(404).json({
        success: false,
        message: `Todo with ID ${body.TODO_ID} not found or no changes made.`,
      });
    }
    return res.json({
      success: true,
      message: `Todo ${body.TODO_ID} updated successfully.`,
    });
  }

  // ── DELETE ───────────────────────────────────
  if (req.method === "DELETE") {
    const todo_id = Number(req.params.id || 0);
    if (!todo_id || todo_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid todo ID is required for deletion.",
      });
    }
    const rows = await deleteTodo(todo_id);
    if (!rows) {
      return res.status(404).json({
        success: false,
        message: `Todo with ID ${todo_id} not found.`,
      });
    }
    return res.json({
      success: true,
      message: `Todo ${todo_id} deleted successfully.`,
    });
  }

  return res.status(405).json({ success: false, message: "Method not supported." });
}

// ─────────────────────────────────────────────
// TODO REORDER HANDLER (PATCH /reorder)
// ─────────────────────────────────────────────
export async function handleReorderTodos(req, res) {
  const items = req.body?.items;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({
      success: false,
      message: "items array is required and must not be empty.",
    });
  }

  for (const item of items) {
    if (!item || !item.TODO_ID) {
      return res.status(400).json({
        success: false,
        message: "Each item must have a TODO_ID.",
      });
    }
    if (!ALLOWED_STATUSES.includes(item.STATUS)) {
      return res.status(400).json({
        success: false,
        message: `STATUS must be one of: ${ALLOWED_STATUSES.join(", ")}.`,
      });
    }
    if (typeof item.SORT_ORDER !== "number" || Number.isNaN(item.SORT_ORDER)) {
      return res.status(400).json({
        success: false,
        message: "Each item must have a numeric SORT_ORDER.",
      });
    }
  }

  await reorderTodos(items);
  return res.json({
    success: true,
    message: `${items.length} todos reordered successfully.`,
  });
}

// ─────────────────────────────────────────────
// TODO STATUS HANDLER (PATCH /:id/status)
// ─────────────────────────────────────────────
export async function handleTodoStatus(req, res) {
  const todo_id = Number(req.params.id || 0);
  const { STATUS, UPDATED_BY } = req.body || {};

  if (!todo_id || todo_id <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid todo ID is required for status update.",
    });
  }
  if (!STATUS) {
    return res.status(400).json({
      success: false,
      message: "STATUS is required.",
    });
  }
  if (!ALLOWED_STATUSES.includes(STATUS)) {
    return res.status(400).json({
      success: false,
      message: `STATUS must be one of: ${ALLOWED_STATUSES.join(", ")}.`,
    });
  }

  const rows = await updateTodoStatus(todo_id, STATUS, UPDATED_BY);
  if (!rows) {
    return res.status(404).json({
      success: false,
      message: `Todo with ID ${todo_id} not found.`,
    });
  }
  return res.json({
    success: true,
    message: `Todo ${todo_id} status updated to ${STATUS}.`,
  });
}