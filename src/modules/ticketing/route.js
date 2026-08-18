// src/modules/ticketing/route.js
import express from "express";
import multer from "multer";
import { ticketHandler } from "./controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { protectRouteV2 } from "../auth-v2/auth-v2.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });




router.get("/lookups",
  asyncHandler((req, res) => { req.params.action = "getLookups"; return ticketHandler(req, res); })
);

router.get("/canned-responses",
  asyncHandler((req, res) => { req.params.action = "listCannedResponses"; return ticketHandler(req, res); })
);

router.get("/:id", protectRouteV2,
  asyncHandler((req, res) => { req.params.action = "getTicket"; return ticketHandler(req, res); })
);

router.get("/",protectRouteV2,
  asyncHandler((req, res) => { req.params.action = "listTickets"; return ticketHandler(req, res); })
);

router.get("/attachments/:attachmentId/file",
  asyncHandler((req, res) => { req.params.action = "getAttachmentFile"; return ticketHandler(req, res); })
);

router.use(protectRouteV2);

router.post("/",
  asyncHandler((req, res) => { req.params.action = "createTicket"; return ticketHandler(req, res); })
);

router.put("/:id/worker",
  asyncHandler((req, res) => { req.params.action = "assignWorker"; return ticketHandler(req, res); })
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

router.post("/canned-responses",
  asyncHandler((req, res) => { req.params.action = "createCannedResponse"; return ticketHandler(req, res); })
);

export default router;