import express from "express";
import multer from "multer";
import * as projectNoteController from "./controller.js";

const router = express.Router();

// ── Multer memory storage — files kept in buffer, written to BLOB column ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

// GET /api/project-note?pId=123&contractorTypeIds=1,2,3
router.get("/", projectNoteController.getNotes);

// GET /api/project-note/doc/:docId  (stream/download a file)
router.get("/doc/:docId", projectNoteController.getDoc);

// DELETE /api/project-note/doc/:docId
router.delete("/doc/:docId", projectNoteController.deleteDoc);

// GET /api/project-note/:noteId
router.get("/:noteId", projectNoteController.getNote);

// POST /api/project-note  (multipart/form-data, field "files" - multiple allowed)
router.post("/", upload.array("files"), projectNoteController.createNote);

// PUT /api/project-note/:noteId (multipart/form-data, field "files" - multiple allowed)
router.put("/:noteId", upload.array("files"), projectNoteController.updateNote);

// DELETE /api/project-note/:noteId
router.delete("/:noteId", projectNoteController.deleteNote);

export default router;