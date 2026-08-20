// src/modules/notifications/notifications.routes.js
import express from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { protectRouteV2 } from "../auth-v2/auth-v2.middleware.js";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notifications.controller.js";

const router = express.Router();

router.use(protectRouteV2);

router.get("/", asyncHandler(getNotifications));
router.get("/unread-count", asyncHandler(getUnreadCount));
router.patch("/read-all", asyncHandler(markAllNotificationsRead));
router.patch("/:id/read", asyncHandler(markNotificationRead));

export default router;