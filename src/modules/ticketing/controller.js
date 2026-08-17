// src/modules/ticketing/controller.js
import * as svc from "./service.js";

const TICKET_TYPES = ["CHANGE_REQUEST", "VARIATION", "SPECIAL_NOTE"];
const AUTHOR_TYPES = ["USER", "AGENT", "SYSTEM"];

const hasPermission = (req, code) =>
  Array.isArray(req.user?.permissions) && req.user.permissions.includes(code);

// ─────────────────────────────────────────────
// SINGLE ACTION-BASED HANDLER
// req.params.action is set by route.js before calling this
// ─────────────────────────────────────────────
export async function ticketHandler(req, res) {
  const action = req.params.action;
  const actorId = req.user?.id ?? null;
  // view_all permission → unrestricted; otherwise self-only (created_by = actor)
  const viewAll = hasPermission(req, "TICKET_VIEW_ALL");

  switch (action) {
    // ── LOOKUPS ─────────────────────────────
    case "getLookups": {
      const data = await svc.getLookups();
      return res.json({ success: true, data });
    }

    // ── TICKETS ─────────────────────────────
    case "createTicket": {
      const b = req.body ?? {};
      if (!b.SUBJECT || !b.PRIORITY_ID || !b.TICKET_TYPE) {
        return res.status(400).json({
          success: false,
          message: "SUBJECT, PRIORITY_ID, TICKET_TYPE are required.",
        });
      }
      if (!TICKET_TYPES.includes(b.TICKET_TYPE)) {
        return res.status(400).json({
          success: false,
          message: `TICKET_TYPE must be one of: ${TICKET_TYPES.join(", ")}.`,
        });
      }
      if (b.TICKET_TYPE === "VARIATION" && (b.CHANGE_AMOUNT === undefined || b.CHANGE_AMOUNT === null || b.CHANGE_AMOUNT === "")) {
        return res.status(400).json({
          success: false,
          message: "CHANGE_AMOUNT is required when TICKET_TYPE is VARIATION.",
        });
      }
      const data = await svc.createTicket(b, actorId);
      return res.status(201).json({ success: true, message: "Ticket created.", data });
    }

    case "listTickets": {
      const result = await svc.listTickets(req.query, actorId, viewAll);
      return res.json({ success: true, ...result });
    }

    case "getTicket": {
      const ticketId = Number(req.params.id);
      const data = await svc.getTicket(ticketId, actorId, viewAll);
      if (!data) return res.status(404).json({ success: false, message: "Ticket not found." });
      return res.json({ success: true, data });
    }

    case "assignWorker": {
      const ticketId = Number(req.params.id);
      if (!req.body?.WORKER_ID) {
        return res.status(400).json({ success: false, message: "WORKER_ID is required." });
      }
      await svc.assignWorker(ticketId, Number(req.body.WORKER_ID), actorId);
      return res.json({ success: true, message: "Worker assigned." });
    }

    case "updateStatus": {
      const ticketId = Number(req.params.id);
      if (!req.body?.STATUS_NAME) {
        return res.status(400).json({ success: false, message: "STATUS_NAME is required." });
      }
      const rows = await svc.updateStatus(ticketId, req.body.STATUS_NAME, actorId);
      if (!rows) return res.status(404).json({ success: false, message: "Ticket not found." });
      return res.json({ success: true, message: "Status updated." });
    }

    // ── COMMENTS ─────────────────────────────
    case "addComment": {
      const ticketId = Number(req.params.id);
      const b = req.body ?? {};
      if (!b.COMMENT_TEXT || !b.AUTHOR_TYPE) {
        return res.status(400).json({ success: false, message: "COMMENT_TEXT and AUTHOR_TYPE are required." });
      }
      if (!AUTHOR_TYPES.includes(b.AUTHOR_TYPE)) {
        return res.status(400).json({ success: false, message: `AUTHOR_TYPE must be one of: ${AUTHOR_TYPES.join(", ")}.` });
      }
      await svc.addComment(ticketId, b, actorId);
      return res.status(201).json({ success: true, message: "Comment added." });
    }

    // ── ATTACHMENTS ──────────────────────────
    case "addAttachment": {
      const ticketId = Number(req.params.id);
      if (!req.file) {
        return res.status(400).json({ success: false, message: "File is required." });
      }
      const fileMeta = {
        FILE_NAME: req.file.originalname,
        FILE_TYPE: req.file.mimetype,
        FILE_DATA: req.file.buffer,
        FILE_SIZE_KB: Math.round((req.file.size ?? 0) / 1024),
        COMMENT_ID: req.body.COMMENT_ID ?? null,
      };
      const id = await svc.addAttachment(ticketId, fileMeta, actorId);
      return res.status(201).json({ success: true, message: "Attachment added.", attachment_id: id });
    }

    case "getAttachmentFile": {
      const attachmentId = Number(req.params.attachmentId);
      const file = await svc.getAttachment(attachmentId);
      if (!file) return res.status(404).json({ success: false, message: "File not found." });
      res.setHeader("Content-Type", file.FILE_TYPE || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${file.FILE_NAME}"`);
      return res.send(file.FILE_DATA);
    }

    // ── CANNED RESPONSES ─────────────────────
    case "listCannedResponses": {
      const data = await svc.listCannedResponses();
      return res.json({ success: true, count: data.length, data });
    }

    case "createCannedResponse": {
      if (!req.body?.TITLE || !req.body?.BODY) {
        return res.status(400).json({ success: false, message: "TITLE and BODY are required." });
      }
      const id = await svc.createCannedResponse(req.body, actorId);
      return res.status(201).json({ success: true, message: "Canned response created.", response_id: id });
    }

    default:
      return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
  }
}