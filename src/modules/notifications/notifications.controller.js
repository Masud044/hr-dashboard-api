// src/modules/notifications/notifications.controller.js
import * as svc from "./notifications.service.js";

const errorResponse = (res, err, fallback) =>
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || fallback,
  });

// ─────────────────────────────────────────────
// GET /api/notifications?page=&limit=
// ─────────────────────────────────────────────
export async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const data = await svc.listNotifications(userId, {
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("getNotifications error:", err);
    return errorResponse(res, err, "Failed to fetch notifications.");
  }
}

// ─────────────────────────────────────────────
// GET /api/notifications/unread-count
// ─────────────────────────────────────────────
export async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;
    const count = await svc.getUnreadCount(userId);
    return res.json({ success: true, count });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    return errorResponse(res, err, "Failed to fetch unread count.");
  }
}

// ─────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// ─────────────────────────────────────────────
export async function markNotificationRead(req, res) {
  try {
    const userId = req.user.id;
    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid notification id." });
    }
    const rows = await svc.markAsRead(notificationId, userId);
    if (!rows) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }
    return res.json({ success: true, message: "Notification marked as read." });
  } catch (err) {
    console.error("markNotificationRead error:", err);
    return errorResponse(res, err, "Failed to mark notification as read.");
  }
}

// ─────────────────────────────────────────────
// PATCH /api/notifications/read-all
// ─────────────────────────────────────────────
export async function markAllNotificationsRead(req, res) {
  try {
    const userId = req.user.id;
    const rows = await svc.markAllAsRead(userId);
    return res.json({
      success: true,
      message: "All notifications marked as read.",
      updated: rows,
    });
  } catch (err) {
    console.error("markAllNotificationsRead error:", err);
    return errorResponse(res, err, "Failed to mark notifications as read.");
  }
}