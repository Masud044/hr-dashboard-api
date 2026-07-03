import express from "express";
import { overviewController } from "./controller.js";

const router = express.Router();

// GET /api/overview
router.get("/", overviewController);

export default router;