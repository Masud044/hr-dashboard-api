// src/modules/ticketing/route.js
import express from "express";
import multer from "multer";
import { ticketHandler } from "./controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { protectRouteV2 } from "../auth-v2/auth-v2.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── GET routes — no auth for now (per current dev phase) ──
router.get("/lookups",
  asyncHandler((req, res) => { req.params.action = "getLookups"; return ticketHandler(req, res); })
);

router.get("/canned-responses",
  asyncHandler((req, res) => { req.params.action = "listCannedResponses"; return ticketHandler(req, res); })
);

router.get("/dashboard/open",
  asyncHandler((req, res) => { req.params.action = "getOpenTicketsView"; return ticketHandler(req, res); })
);

router.get("/dashboard/agent-workload",
  asyncHandler((req, res) => { req.params.action = "getAgentWorkloadView"; return ticketHandler(req, res); })
);

router.get("/:id",
  asyncHandler((req, res) => { req.params.action = "getTicket"; return ticketHandler(req, res); })
);

router.get("/",
  asyncHandler((req, res) => { req.params.action = "listTickets"; return ticketHandler(req, res); })
);

router.get("/attachments/:attachmentId/file",
  asyncHandler((req, res) => { req.params.action = "getAttachmentFile"; return ticketHandler(req, res); })
);

// ── Everything below requires a valid Bearer token ──
router.use(protectRouteV2);

router.post("/",
  asyncHandler((req, res) => { req.params.action = "createTicket"; return ticketHandler(req, res); })
);

router.put("/:id/assign",
  asyncHandler((req, res) => { req.params.action = "assignAgent"; return ticketHandler(req, res); })
);

router.put("/:id/status",
  asyncHandler((req, res) => { req.params.action = "updateStatus"; return ticketHandler(req, res); })
);

router.post("/:id/comments",
  asyncHandler((req, res) => { req.params.action = "addComment"; return ticketHandler(req, res); })
);

router.post("/:id/attachments",
  upload.single("file"),
  asyncHandler((req, res) => { req.params.action = "addAttachment"; return ticketHandler(req, res); })
);

router.post("/:id/rating",
  asyncHandler((req, res) => { req.params.action = "rateTicket"; return ticketHandler(req, res); })
);

router.post("/canned-responses",
  asyncHandler((req, res) => { req.params.action = "createCannedResponse"; return ticketHandler(req, res); })
);

export default router;