// src/modules/ticketing/service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";
import { calcDueDateNow } from "./slaCalculator.js";

// ─────────────────────────────────────────────
// LOOKUPS
// ─────────────────────────────────────────────
export async function getLookups() {
  const conn = await getConnection();
  try {
    const [statuses, priorities, categories] = await Promise.all([
      conn.execute(`SELECT * FROM ticket_statuses ORDER BY sort_order`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      conn.execute(`SELECT * FROM ticket_priorities ORDER BY sort_order`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      conn.execute(`SELECT * FROM ticket_categories WHERE active = 'Y' ORDER BY category_name`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
    ]);
    return {
      statuses: statuses.rows,
      priorities: priorities.rows,
      categories: categories.rows,
    };
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// CREATE TICKET
// ─────────────────────────────────────────────
export async function createTicket(data, actorId) {
  const conn = await getConnection();
  try {
    const statusRow = await conn.execute(
      `SELECT status_id FROM ticket_statuses WHERE status_name = 'NEW'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const statusId = statusRow.rows[0]?.STATUS_ID;
    if (!statusId) throw new Error("NEW status not configured");

    const prioRow = await conn.execute(
      `SELECT sla_hours FROM ticket_priorities WHERE priority_id = :id`,
      { id: data.PRIORITY_ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const slaHours = prioRow.rows[0]?.SLA_HOURS;
    if (!slaHours) throw new Error("Invalid priority_id");

    const dueDate = await calcDueDateNow(slaHours);

    const result = await conn.execute(
      `INSERT INTO tickets
        (created_by, requested_for, category_id, priority_id, status_id,
         subject, description, channel, due_date)
       VALUES
        (:created_by, :requested_for, :category_id, :priority_id, :status_id,
         :subject, :description, :channel, :due_date)
       RETURNING ticket_id, ticket_number INTO :new_id, :new_number`,
      {
        created_by: actorId,
        requested_for: data.REQUESTED_FOR ?? actorId,
        category_id: data.CATEGORY_ID,
        priority_id: data.PRIORITY_ID,
        status_id: statusId,
        subject: data.SUBJECT,
        description: data.DESCRIPTION ?? null,
        channel: data.CHANNEL ?? "WEB",
        due_date: dueDate,
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        new_number: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      },
      { autoCommit: false }
    );

    await conn.commit();
    return {
      ticket_id: result.outBinds.new_id[0],
      ticket_number: result.outBinds.new_number[0],
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// LIST TICKETS (dashboard / "my tickets")
// ─────────────────────────────────────────────
export async function listTickets(filters = {}) {
  const conn = await getConnection();
  try {
    const conditions = [];
    const binds = {};

    if (filters.STATUS_ID)      { conditions.push(`t.status_id = :status_id`); binds.status_id = Number(filters.STATUS_ID); }
    if (filters.PRIORITY_ID)    { conditions.push(`t.priority_id = :priority_id`); binds.priority_id = Number(filters.PRIORITY_ID); }
    if (filters.CATEGORY_ID)    { conditions.push(`t.category_id = :category_id`); binds.category_id = Number(filters.CATEGORY_ID); }
    if (filters.AGENT_ID)       { conditions.push(`t.agent_id = :agent_id`); binds.agent_id = Number(filters.AGENT_ID); }
    if (filters.REQUESTED_FOR)  { conditions.push(`t.requested_for = :requested_for`); binds.requested_for = Number(filters.REQUESTED_FOR); }
    if (filters.OPEN_ONLY === "true") conditions.push(`st.is_closed = 'N'`);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
       FROM tickets t
       JOIN ticket_categories cat ON cat.category_id = t.category_id
       JOIN ticket_priorities pr  ON pr.priority_id  = t.priority_id
       JOIN ticket_statuses   st  ON st.status_id    = t.status_id
       ${where}`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const total = countRes.rows[0].TOTAL;

    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.max(1, Number(filters.limit || 20));
    const offset = (page - 1) * limit;
    binds.offset = offset;
    binds.limit = limit;

    const result = await conn.execute(
      `SELECT
         t.ticket_id, t.ticket_number, t.subject, t.created_by, t.requested_for,
         t.agent_id, t.channel, t.created_at, t.due_date, t.resolved_at, t.closed_at,
         t.satisfaction_rating,
         cat.category_name, pr.priority_name, st.status_name, st.is_closed
       FROM tickets t
       JOIN ticket_categories cat ON cat.category_id = t.category_id
       JOIN ticket_priorities pr  ON pr.priority_id  = t.priority_id
       JOIN ticket_statuses   st  ON st.status_id    = t.status_id
       ${where}
       ORDER BY t.created_at DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return { total, page, limit, data: result.rows };
  } finally {
    await conn.close();
  }
}
// ─────────────────────────────────────────────
// GET TICKET DETAIL (header + comments + history + attachments)
// ─────────────────────────────────────────────
export async function getTicket(ticketId) {
  const conn = await getConnection();
  try {
    const header = await conn.execute(
      `SELECT
         t.*, cat.category_name, pr.priority_name, st.status_name, st.is_closed
       FROM tickets t
       JOIN ticket_categories cat ON cat.category_id = t.category_id
       JOIN ticket_priorities pr  ON pr.priority_id  = t.priority_id
       JOIN ticket_statuses   st  ON st.status_id    = t.status_id
       WHERE t.ticket_id = :id`,
      { id: ticketId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!header.rows.length) return null;

    const comments = await conn.execute(
      `SELECT * FROM ticket_comments WHERE ticket_id = :id ORDER BY created_at ASC`,
      { id: ticketId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const history = await conn.execute(
      `SELECT * FROM ticket_history WHERE ticket_id = :id ORDER BY changed_at DESC`,
      { id: ticketId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const attachments = await conn.execute(
      `SELECT * FROM ticket_attachments WHERE ticket_id = :id ORDER BY uploaded_at DESC`,
      { id: ticketId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      ticket: header.rows[0],
      comments: comments.rows,
      history: history.rows,
      attachments: attachments.rows,
    };
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// ASSIGN AGENT (auto NEW → OPEN)
// ─────────────────────────────────────────────
export async function assignAgent(ticketId, agentId) {
  const conn = await getConnection();
  try {
    const cur = await conn.execute(
      `SELECT s.status_name FROM tickets t
       JOIN ticket_statuses s ON s.status_id = t.status_id
       WHERE t.ticket_id = :id`,
      { id: ticketId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!cur.rows.length) throw new Error("Ticket not found");

    await conn.execute(
      `UPDATE tickets SET agent_id = :agent_id WHERE ticket_id = :id`,
      { agent_id: agentId, id: ticketId },
      { autoCommit: false }
    );

    if (cur.rows[0].STATUS_NAME === "NEW") {
      const openStatus = await conn.execute(
        `SELECT status_id FROM ticket_statuses WHERE status_name = 'OPEN'`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      await conn.execute(
        `UPDATE tickets SET status_id = :sid WHERE ticket_id = :id`,
        { sid: openStatus.rows[0].STATUS_ID, id: ticketId },
        { autoCommit: false }
      );
    }

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// UPDATE STATUS (stamps resolved_at / closed_at)
// ─────────────────────────────────────────────
export async function updateStatus(ticketId, statusName) {
  const conn = await getConnection();
  try {
    const statusRow = await conn.execute(
      `SELECT status_id FROM ticket_statuses WHERE status_name = :name`,
      { name: statusName },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const statusId = statusRow.rows[0]?.STATUS_ID;
    if (!statusId) throw new Error(`Unknown status: ${statusName}`);

    const result = await conn.execute(
      `UPDATE tickets
       SET status_id   = :status_id,
           resolved_at = CASE WHEN :status_name = 'RESOLVED' THEN SYSTIMESTAMP ELSE resolved_at END,
           closed_at   = CASE WHEN :status_name = 'CLOSED'   THEN SYSTIMESTAMP ELSE closed_at END
       WHERE ticket_id = :id`,
      { status_id: statusId, status_name: statusName, id: ticketId },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// ADD COMMENT (auto-reopens PENDING_USER tickets)
// ─────────────────────────────────────────────
export async function addComment(ticketId, data, actorId) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO ticket_comments
        (ticket_id, author_type, author_id, comment_text, is_internal, canned_response_id)
       VALUES
        (:ticket_id, :author_type, :author_id, :comment_text, :is_internal, :canned_response_id)`,
      {
        ticket_id: ticketId,
        author_type: data.AUTHOR_TYPE,
        author_id: actorId,
        comment_text: data.COMMENT_TEXT,
        is_internal: data.IS_INTERNAL ?? "N",
        canned_response_id: data.CANNED_RESPONSE_ID ?? null,
      },
      { autoCommit: false }
    );

    if (data.AUTHOR_TYPE === "USER") {
      await conn.execute(
        `UPDATE tickets
         SET status_id = (SELECT status_id FROM ticket_statuses WHERE status_name = 'OPEN')
         WHERE ticket_id = :id
           AND status_id = (SELECT status_id FROM ticket_statuses WHERE status_name = 'PENDING_USER')`,
        { id: ticketId },
        { autoCommit: false }
      );
    }

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────
export async function addAttachment(ticketId, fileMeta, uploadedBy) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO ticket_attachments
        (ticket_id, comment_id, file_name, file_type, file_data, file_size_kb, uploaded_by)
       VALUES
        (:ticket_id, :comment_id, :file_name, :file_type, :file_data, :file_size_kb, :uploaded_by)
       RETURNING attachment_id INTO :new_id`,
      {
        ticket_id: ticketId,
        comment_id: fileMeta.COMMENT_ID ?? null,
        file_name: fileMeta.FILE_NAME,
        file_type: fileMeta.FILE_TYPE,
        file_data: fileMeta.FILE_DATA,
        file_size_kb: fileMeta.FILE_SIZE_KB ?? null,
        uploaded_by: uploadedBy,
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
// CSAT RATING
// ─────────────────────────────────────────────
export async function rateTicket(ticketId, rating, comment) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE tickets
       SET satisfaction_rating = :rating, satisfaction_comment = :comment
       WHERE ticket_id = :id`,
      { rating, comment: comment ?? null, id: ticketId },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// CANNED RESPONSES
// ─────────────────────────────────────────────
export async function listCannedResponses() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM canned_responses WHERE active = 'Y' ORDER BY title`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function createCannedResponse(data, actorId) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO canned_responses (title, body, category_id, created_by)
       VALUES (:title, :body, :category_id, :created_by)
       RETURNING response_id INTO :new_id`,
      {
        title: data.TITLE,
        body: data.BODY,
        category_id: data.CATEGORY_ID ?? null,
        created_by: actorId,
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
// DASHBOARD VIEWS
// ─────────────────────────────────────────────
export async function getOpenTicketsView() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM vw_open_tickets ORDER BY hours_overdue DESC, due_date ASC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function getAgentWorkloadView() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM vw_agent_workload ORDER BY open_tickets DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}



export async function getAttachment(attachmentId) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT file_name, file_type, file_data FROM ticket_attachments WHERE attachment_id = :id`,
      { id: attachmentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}