// src/modules/ticketing/service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";
import { AppError } from "../../utils/appError.js";
import { createNotification } from "../notifications/notifications.service.js";

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
// CREATE TICKET (project-scoped)
// ─────────────────────────────────────────────
export async function createTicket(data, actorId) {
  const conn = await getConnection();
  try {
    const projectId = data.PROJECT_ID != null ? Number(data.PROJECT_ID) : null;
    const contractorId = data.CONTRACTOR_ID != null ? Number(data.CONTRACTOR_ID) : null;
    const ownerId = data.OWNER_ID != null ? Number(data.OWNER_ID) : null;
    const priorityId = Number(data.PRIORITY_ID);

    // No FK constraints in this DB — validate referential targets explicitly.
    // project_id / contractor_id / owner_id are optional; only validate when provided.
    if (projectId != null) {
      const projectRow = await conn.execute(
        `SELECT P_ID FROM PM.PM_PROJECT WHERE P_ID = :id`,
        { id: projectId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!projectRow.rows.length) {
        throw new AppError(`Project ${projectId} does not exist.`, 400);
      }
    }

    if (contractorId != null) {
      const contractorRow = await conn.execute(
        `SELECT CONTRATOR_ID FROM PM.PM_CONTRACTOR_INFO WHERE CONTRATOR_ID = :id`,
        { id: contractorId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!contractorRow.rows.length) {
        throw new AppError(`Contractor ${contractorId} does not exist.`, 400);
      }
    }

    if (ownerId != null) {
      const ownerRow = await conn.execute(
        `SELECT ID FROM PM.PM_OWNER_INFO WHERE ID = :id`,
        { id: ownerId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!ownerRow.rows.length) {
        throw new AppError(`Owner ${ownerId} does not exist.`, 400);
      }
    }

    const prioRow = await conn.execute(
      `SELECT priority_id FROM ticket_priorities WHERE priority_id = :id`,
      { id: priorityId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!prioRow.rows.length) {
      throw new AppError(`Invalid priority_id ${priorityId}.`, 400);
    }

    const statusRow = await conn.execute(
      `SELECT status_id FROM ticket_statuses WHERE status_name = 'OPEN'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const statusId = statusRow.rows[0]?.STATUS_ID;
    if (!statusId) throw new AppError("OPEN status not configured.", 500);

    const result = await conn.execute(
      `INSERT INTO tickets
        (project_id, contractor_id, owner_id, created_by, assigned_worker_id,
         ticket_type, category_id, priority_id, status_id,
         subject, description, due_date, change_amount)
       VALUES
        (:project_id, :contractor_id, :owner_id, :created_by, :assigned_worker_id,
         :ticket_type, :category_id, :priority_id, :status_id,
         :subject, :description, :due_date, :change_amount)
       RETURNING ticket_id, ticket_number INTO :new_id, :new_number`,
      {
        project_id: projectId,
        contractor_id: contractorId,
        owner_id: ownerId,
        created_by: actorId,
        assigned_worker_id: data.ASSIGNED_WORKER_ID ?? null,
        ticket_type: data.TICKET_TYPE,
        category_id: data.CATEGORY_ID ?? null,
        priority_id: priorityId,
        status_id: statusId,
        subject: data.SUBJECT,
        description: data.DESCRIPTION ?? null,
        due_date: data.DUE_DATE ? new Date(data.DUE_DATE) : null,
        change_amount: data.TICKET_TYPE === "VARIATION" ? Number(data.CHANGE_AMOUNT ?? null) : null,
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        new_number: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      },
      { autoCommit: false }
    );

    await conn.commit();

    // ── Notifications (fire-and-forget — never fail ticket creation on notification errors)
    try {
      const ticketId = result.outBinds.new_id[0];
      const assignedWorkerRef =
        data.ASSIGNED_WORKER_ID != null ? Number(data.ASSIGNED_WORKER_ID) : null;

      // Resolve ref-table IDs (owner/worker/contractor) to real USERS.ID in one query.
      const refMap = new Map();
      const refRes = await conn.execute(
        `SELECT ID, USER_TYPE, REF_ID
         FROM USERS
         WHERE (USER_TYPE = 'OWNER'      AND REF_ID = :owner_id)
            OR (USER_TYPE = 'WORKER'     AND REF_ID = :assigned_worker_id)
            OR (USER_TYPE = 'CONTRACTOR' AND REF_ID = :contractor_id)`,
        {
          owner_id: ownerId,
          assigned_worker_id: assignedWorkerRef,
          contractor_id: contractorId,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      for (const row of refRes.rows) {
        refMap.set(`${row.USER_TYPE}:${row.REF_ID}`, row.ID);
      }

      // Silently skip refs with no matching USERS row (no login account); never notify the creator.
      const recipients = new Set(
        [
          refMap.get(`OWNER:${ownerId}`),
          refMap.get(`WORKER:${assignedWorkerRef}`),
          refMap.get(`CONTRACTOR:${contractorId}`),
        ].filter((id) => id != null && Number(id) !== Number(actorId))
      );

      for (const recipientId of recipients) {
        try {
          await createNotification({
            userId: recipientId,
            type: "TICKET_CREATED",
            title: "New ticket created",
            message: data.SUBJECT,
            entityType: "TICKET",
            entityId: ticketId,
            link: `/dashboard/tickets/${ticketId}`,
          });
        } catch (notifErr) {
          console.error(`Failed to create notification for user ${recipientId}:`, notifErr);
        }
      }
    } catch (notifErr) {
      console.error("Failed to notify ticket recipients:", notifErr);
    }

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
// LIST TICKETS (dashboard / project-scoped list)
// access: viewAll=false + actorId => only tickets created by actorId,
//         or tied to actor via owner_id / assigned_worker_id / contractor_id (by userType)
// ─────────────────────────────────────────────
export async function listTickets(filters = {}, actorId = null, viewAll = false, userType = null, refId = null) {
  const conn = await getConnection();
  try {
    const conditions = [];
    const binds = {};

    if (filters.PROJECT_ID)     { conditions.push(`t.project_id = :project_id`);     binds.project_id = Number(filters.PROJECT_ID); }
    if (filters.CONTRACTOR_ID)  { conditions.push(`t.contractor_id = :contractor_id`); binds.contractor_id = Number(filters.CONTRACTOR_ID); }
    if (filters.OWNER_ID)       { conditions.push(`t.owner_id = :owner_id`);         binds.owner_id = Number(filters.OWNER_ID); }
    if (filters.TICKET_TYPE)    { conditions.push(`t.ticket_type = :ticket_type`);    binds.ticket_type = filters.TICKET_TYPE; }
    if (filters.STATUS_ID)      { conditions.push(`t.status_id = :status_id`);        binds.status_id = Number(filters.STATUS_ID); }
    if (filters.PRIORITY_ID)    { conditions.push(`t.priority_id = :priority_id`);    binds.priority_id = Number(filters.PRIORITY_ID); }
    if (filters.CATEGORY_ID)    { conditions.push(`t.category_id = :category_id`);    binds.category_id = Number(filters.CATEGORY_ID); }
    if (filters.OPEN_ONLY === "true") conditions.push(`st.is_closed = 'N'`);

    if (!viewAll && actorId) {
      const orConditions = [`t.created_by = :created_by`];
      binds.created_by = actorId;
      if (userType === "OWNER" && refId != null) {
        orConditions.push(`t.owner_id = :ref_id`);
        binds.ref_id = Number(refId);
      } else if (userType === "WORKER" && refId != null) {
        orConditions.push(`t.assigned_worker_id = :ref_id`);
        binds.ref_id = Number(refId);
      } else if (userType === "CONTRACTOR" && refId != null) {
        orConditions.push(`t.contractor_id = :ref_id`);
        binds.ref_id = Number(refId);
      }
      conditions.push(`(${orConditions.join(" OR ")})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
       FROM tickets t
       LEFT JOIN ticket_categories cat ON cat.category_id = t.category_id
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
         t.ticket_id, t.ticket_number, t.project_id, t.contractor_id, t.owner_id,
         t.created_by, t.assigned_worker_id, t.ticket_type,
         t.category_id, t.priority_id, t.status_id,
         t.subject, t.created_at, t.due_date, t.resolved_at, t.closed_at, t.change_amount,
         pr.priority_name, st.status_name, st.is_closed, cat.category_name,
         p.P_NAME AS project_name, c.CONTRATOR_NAME AS contractor_name, o.O_NAME AS owner_name
       FROM tickets t
       LEFT JOIN ticket_categories cat ON cat.category_id = t.category_id
       JOIN ticket_priorities pr  ON pr.priority_id  = t.priority_id
       JOIN ticket_statuses   st  ON st.status_id    = t.status_id
       LEFT JOIN PM.PM_PROJECT p         ON p.P_ID = t.project_id
       LEFT JOIN PM.PM_CONTRACTOR_INFO c ON c.CONTRATOR_ID = t.contractor_id
       LEFT JOIN PM.PM_OWNER_INFO o      ON o.ID = t.owner_id
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
// access: viewAll=false + actorId => only if created_by === actorId,
//         or tied to actor via owner_id / assigned_worker_id / contractor_id (by userType)
// ─────────────────────────────────────────────
export async function getTicket(ticketId, actorId = null, viewAll = false, userType = null, refId = null) {
  const conn = await getConnection();
  try {
    const header = await conn.execute(
      `SELECT
         t.*, pr.priority_name, st.status_name, st.is_closed, cat.category_name,
         p.P_NAME AS project_name, c.CONTRATOR_NAME AS contractor_name, o.O_NAME AS owner_name
       FROM tickets t
       LEFT JOIN ticket_categories cat ON cat.category_id = t.category_id
       JOIN ticket_priorities pr  ON pr.priority_id  = t.priority_id
       JOIN ticket_statuses   st  ON st.status_id    = t.status_id
       LEFT JOIN PM.PM_PROJECT p         ON p.P_ID = t.project_id
       LEFT JOIN PM.PM_CONTRACTOR_INFO c ON c.CONTRATOR_ID = t.contractor_id
       LEFT JOIN PM.PM_OWNER_INFO o      ON o.ID = t.owner_id
       WHERE t.ticket_id = :id`,
      { id: ticketId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!header.rows.length) return null;

    const ticket = header.rows[0];
    if (!viewAll && actorId) {
      let allowed = Number(ticket.CREATED_BY) === Number(actorId);
      if (!allowed && userType === "OWNER" && refId != null) {
        allowed = Number(ticket.OWNER_ID) === Number(refId);
      } else if (!allowed && userType === "WORKER" && refId != null) {
        allowed = Number(ticket.ASSIGNED_WORKER_ID) === Number(refId);
      } else if (!allowed && userType === "CONTRACTOR" && refId != null) {
        allowed = Number(ticket.CONTRACTOR_ID) === Number(refId);
      }
      if (!allowed) return null;
    }

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
      ticket,
      comments: comments.rows,
      history: history.rows,
      attachments: attachments.rows,
    };
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// ASSIGN WORKER (assigned_worker_id, writes ticket_history)
// ─────────────────────────────────────────────
export async function assignWorker(ticketId, workerId, actorId) {
  const conn = await getConnection();
  try {
    const curRow = await conn.execute(
      `SELECT assigned_worker_id FROM tickets WHERE ticket_id = :id`,
      { id: ticketId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!curRow.rows.length) throw new AppError("Ticket not found.", 404);
    const oldWorkerId = curRow.rows[0].ASSIGNED_WORKER_ID;

    const result = await conn.execute(
      `UPDATE tickets SET assigned_worker_id = :worker_id WHERE ticket_id = :id`,
      { worker_id: workerId, id: ticketId },
      { autoCommit: false }
    );
    if (!result.rowsAffected) {
      await conn.rollback();
      throw new AppError("Ticket not found.", 404);
    }

    if (Number(oldWorkerId ?? -1) !== Number(workerId ?? -1)) {
      await conn.execute(
        `INSERT INTO ticket_history
          (ticket_id, field_changed, old_value, new_value, changed_by, changed_by_id)
         VALUES
          (:ticket_id, 'TRADE_CONTACT', :old_value, :new_value, 'USER', :changed_by_id)`,
        {
          ticket_id: ticketId,
          old_value: oldWorkerId != null ? String(oldWorkerId) : null,
          new_value: workerId != null ? String(workerId) : null,
          changed_by_id: actorId ?? null,
        },
        { autoCommit: false }
      );
    }

    await conn.commit();

    // ── Notifications (fire-and-forget — never fail the assignment on notification errors)
    try {
      if (workerId != null && Number(oldWorkerId ?? -1) !== Number(workerId ?? -1)) {
        const subjectRow = await conn.execute(
          `SELECT subject FROM tickets WHERE ticket_id = :id`,
          { id: ticketId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const subject = subjectRow.rows[0]?.SUBJECT ?? "Ticket";

        // Resolve worker ref-table ID to real USERS.ID; skip if no login account.
        const userRow = await conn.execute(
          `SELECT ID FROM USERS WHERE USER_TYPE = 'WORKER' AND REF_ID = :worker_id`,
          { worker_id: Number(workerId) },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const recipientId = userRow.rows[0]?.ID ?? null;

        if (recipientId != null && Number(recipientId) !== Number(actorId)) {
          try {
            await createNotification({
              userId: recipientId,
              type: "TICKET_ASSIGNED",
              title: "You were assigned a ticket",
              message: subject,
              entityType: "TICKET",
              entityId: ticketId,
              link: `/dashboard/tickets/${ticketId}`,
            });
          } catch (notifErr) {
            console.error(`Failed to create notification for user ${recipientId}:`, notifErr);
          }
        }
      }
    } catch (notifErr) {
      console.error("Failed to notify assigned worker:", notifErr);
    }

    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// UPDATE STATUS (stamps closed_at, writes ticket_history)
// ─────────────────────────────────────────────
export async function updateStatus(ticketId, statusName, actorId) {
  const conn = await getConnection();
  try {
    const statusRow = await conn.execute(
      `SELECT status_id FROM ticket_statuses WHERE status_name = :name`,
      { name: statusName },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const statusId = statusRow.rows[0]?.STATUS_ID;
    if (!statusId) throw new AppError(`Unknown status: ${statusName}`, 400);

    const curRow = await conn.execute(
      `SELECT status_id FROM tickets WHERE ticket_id = :id`,
      { id: ticketId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!curRow.rows.length) throw new AppError("Ticket not found.", 404);
    const oldStatusId = curRow.rows[0].STATUS_ID;

    const result = await conn.execute(
      `UPDATE tickets
       SET status_id = :status_id,
           closed_at = CASE WHEN :status_name = 'CLOSED' THEN SYSTIMESTAMP ELSE closed_at END
       WHERE ticket_id = :id`,
      { status_id: statusId, status_name: statusName, id: ticketId },
      { autoCommit: false }
    );
    if (!result.rowsAffected) {
      await conn.rollback();
      throw new AppError("Ticket not found.", 404);
    }

    if (Number(oldStatusId) !== Number(statusId)) {
      await conn.execute(
        `INSERT INTO ticket_history
          (ticket_id, field_changed, old_value, new_value, changed_by, changed_by_id)
         VALUES
          (:ticket_id, 'STATUS', :old_value, :new_value, 'USER', :changed_by_id)`,
        {
          ticket_id: ticketId,
          old_value: String(oldStatusId),
          new_value: String(statusId),
          changed_by_id: actorId ?? null,
        },
        { autoCommit: false }
      );
    }

    await conn.commit();
    return result.rowsAffected;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// ─────────────────────────────────────────────
// ADD COMMENT
// ─────────────────────────────────────────────
export async function addComment(ticketId, data, actorId) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
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
    if (!result.rowsAffected) {
      await conn.rollback();
      throw new AppError("Ticket not found.", 404);
    }
    await conn.commit();

    // ── Notifications (fire-and-forget — never fail the comment on notification errors)
    try {
      const ticketRow = await conn.execute(
        `SELECT created_by, owner_id, assigned_worker_id, contractor_id, subject
         FROM tickets WHERE ticket_id = :id`,
        { id: ticketId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const ticket = ticketRow.rows[0];
      if (ticket) {
        // Resolve ref-table IDs (owner/worker/contractor) to real USERS.ID in one query.
        // created_by is already a USERS.ID and needs no resolution.
        const refMap = new Map();
        const refRes = await conn.execute(
          `SELECT ID, USER_TYPE, REF_ID
           FROM USERS
           WHERE (USER_TYPE = 'OWNER'      AND REF_ID = :owner_id)
              OR (USER_TYPE = 'WORKER'     AND REF_ID = :assigned_worker_id)
              OR (USER_TYPE = 'CONTRACTOR' AND REF_ID = :contractor_id)`,
          {
            owner_id: ticket.OWNER_ID ?? null,
            assigned_worker_id: ticket.ASSIGNED_WORKER_ID ?? null,
            contractor_id: ticket.CONTRACTOR_ID ?? null,
          },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        for (const row of refRes.rows) {
          refMap.set(`${row.USER_TYPE}:${row.REF_ID}`, row.ID);
        }

        // Silently skip refs with no matching USERS row (no login account).
        const recipients = new Set(
          [
            ticket.CREATED_BY,
            refMap.get(`OWNER:${ticket.OWNER_ID}`),
            refMap.get(`WORKER:${ticket.ASSIGNED_WORKER_ID}`),
            refMap.get(`CONTRACTOR:${ticket.CONTRACTOR_ID}`),
          ].filter((id) => id != null && Number(id) !== Number(actorId))
        );
        const message =
          ticket.SUBJECT ||
          String(data.COMMENT_TEXT ?? "").slice(0, 120) ||
          "New comment on ticket";
        for (const recipientId of recipients) {
          try {
            await createNotification({
              userId: recipientId,
              type: "TICKET_COMMENT",
              title: "New comment on ticket",
              message,
              entityType: "TICKET",
              entityId: ticketId,
              link: `/dashboard/tickets/${ticketId}`,
            });
          } catch (notifErr) {
            console.error(`Failed to create notification for user ${recipientId}:`, notifErr);
          }
        }
      }
    } catch (notifErr) {
      console.error("Failed to notify ticket recipients:", notifErr);
    }

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
// ATTACHMENT FILE
// ─────────────────────────────────────────────
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