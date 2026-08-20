// src/modules/notifications/notifications.service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ─────────────────────────────────────────────
// CREATE NOTIFICATION (generic — imported and called by OTHER modules)
// ─────────────────────────────────────────────
export async function createNotification({ userId, type, title, message, entityType, entityId, link }) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO notifications
        (user_id, type, title, message, entity_type, entity_id, link, created_at)
       VALUES
        (:user_id, :type, :title, :message, :entity_type, :entity_id, :link, :created_at)
       RETURNING notification_id INTO :new_id`,
      {
        user_id: userId,
        type: type ?? null,
        title: title ?? null,
        message: message ?? null,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
        link: link ?? null,
        created_at: new Date(),
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );
    return result.outBinds.new_id[0];
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// LIST NOTIFICATIONS (paginated, newest first, user-scoped)
// ─────────────────────────────────────────────
export async function listNotifications(userId, { page = 1, limit = 20 } = {}) {
  const conn = await getConnection();
  try {
    const countRes = await conn.execute(
      `SELECT COUNT(*) AS TOTAL FROM notifications WHERE user_id = :user_id`,
      { user_id: userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const total = countRes.rows[0].TOTAL;

    const p = Math.max(1, Number(page || 1));
    const l = Math.max(1, Number(limit || 20));
    const offset = (p - 1) * l;

    const result = await conn.execute(
      `SELECT notification_id, user_id, type, title, message, entity_type,
              entity_id, link, is_read, created_at
       FROM notifications
       WHERE user_id = :user_id
       ORDER BY created_at DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { user_id: userId, offset, limit: l },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return { total, page: p, limit: l, data: result.rows };
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// UNREAD COUNT
// ─────────────────────────────────────────────
export async function getUnreadCount(userId) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
       FROM notifications
       WHERE user_id = :user_id AND is_read = 'N'`,
      { user_id: userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0].TOTAL;
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// MARK ONE AS READ (scoped to owner — returns rowsAffected)
// ─────────────────────────────────────────────
export async function markAsRead(notificationId, userId) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE notifications SET is_read = 'Y'
       WHERE notification_id = :id AND user_id = :user_id`,
      { id: notificationId, user_id: userId },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// MARK ALL AS READ (user-scoped)
// ─────────────────────────────────────────────
export async function markAllAsRead(userId) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE notifications SET is_read = 'Y'
       WHERE user_id = :user_id AND is_read = 'N'`,
      { user_id: userId },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
}