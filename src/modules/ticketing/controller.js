// src/modules/ticketing/controller.js
import * as svc from "./service.js";

// ─────────────────────────────────────────────
// SINGLE ACTION-BASED HANDLER
// req.params.action is set by route.js before calling this
// ─────────────────────────────────────────────
export async function ticketHandler(req, res) {
  const action = req.params.action;
  const actorId = req.user?.id ?? req.body?.ACTOR_ID ?? null; // fallback while GET routes are unauth'd

  switch (action) {
    // ── LOOKUPS ─────────────────────────────
    case "getLookups": {
      const data = await svc.getLookups();
      return res.json({ success: true, data });
    }

    // ── TICKETS ─────────────────────────────
    case "createTicket": {
      if (!req.body?.SUBJECT || !req.body?.CATEGORY_ID || !req.body?.PRIORITY_ID) {
        return res.status(400).json({ success: false, message: "SUBJECT, CATEGORY_ID, PRIORITY_ID are required." });
      }
      const data = await svc.createTicket(req.body, actorId);
      return res.status(201).json({ success: true, message: "Ticket created.", data });
    }

   case "listTickets": {
  const result = await svc.listTickets(req.query);
  return res.json({ success: true, ...result });
}

    case "getTicket": {
      const ticketId = Number(req.params.id);
      const data = await svc.getTicket(ticketId);
      if (!data) return res.status(404).json({ success: false, message: "Ticket not found." });
      return res.json({ success: true, data });
    }

    case "assignAgent": {
      const ticketId = Number(req.params.id);
      if (!req.body?.AGENT_ID) {
        return res.status(400).json({ success: false, message: "AGENT_ID is required." });
      }
      await svc.assignAgent(ticketId, req.body.AGENT_ID);
      return res.json({ success: true, message: "Agent assigned." });
    }

    case "updateStatus": {
      const ticketId = Number(req.params.id);
      if (!req.body?.STATUS_NAME) {
        return res.status(400).json({ success: false, message: "STATUS_NAME is required." });
      }
      const rows = await svc.updateStatus(ticketId, req.body.STATUS_NAME);
      if (!rows) return res.status(404).json({ success: false, message: "Ticket not found." });
      return res.json({ success: true, message: "Status updated." });
    }

    // ── COMMENTS ─────────────────────────────
    case "addComment": {
      const ticketId = Number(req.params.id);
      if (!req.body?.COMMENT_TEXT || !req.body?.AUTHOR_TYPE) {
        return res.status(400).json({ success: false, message: "COMMENT_TEXT and AUTHOR_TYPE are required." });
      }
      await svc.addComment(ticketId, req.body, actorId);
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

    // ── CSAT ─────────────────────────────────
    case "rateTicket": {
      const ticketId = Number(req.params.id);
      const rating = Number(req.body?.RATING);
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: "RATING must be 1-5." });
      }
      const rows = await svc.rateTicket(ticketId, rating, req.body.COMMENT);
      if (!rows) return res.status(404).json({ success: false, message: "Ticket not found." });
      return res.json({ success: true, message: "Rating saved." });
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

    // ── DASHBOARD ─────────────────────────────
    case "getOpenTicketsView": {
      const data = await svc.getOpenTicketsView();
      return res.json({ success: true, count: data.length, data });
    }

    case "getAgentWorkloadView": {
      const data = await svc.getAgentWorkloadView();
      return res.json({ success: true, count: data.length, data });
    }

    default:
      return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
  }
}