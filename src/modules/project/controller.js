// src\modules\project\controller.js
import multer from "multer";
import {
  insertProject,
  searchProject,
  updateProject,
  deleteProject,
  getDocBlob,
  uploadCertificateDoc,
  sendBulkEmailToContractors,
  reorderProject,
   updateProjectStatus,
   updateProjectMargin,
  moveProject,
} from "./service.js";

// ─────────────────────────────────────────────
// Multer — memoryStorage (disk এ কিছু লেখে না)
// File content সরাসরি Buffer হিসেবে আসে → BLOB এ যাবে
// ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per file
  fileFilter(_req, file, cb) {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type "${file.mimetype}" is not allowed.`));
  },
}).array("MANDATORY_FILES", 20);  // field name: MANDATORY_FILES

function runUpload(req, res) {
  return new Promise((resolve, reject) =>
    upload(req, res, (err) => (err ? reject(err) : resolve()))
  );
}

// ─────────────────────────────────────────────
// MAIN PROJECT HANDLER
// ─────────────────────────────────────────────
export async function handleProject(req, res) {
  // ── POST  ────────────────────────────────────
  if (req.method === "POST") {
    try {
      await runUpload(req, res);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const body = req.body;
    if (!body?.P_NAME || !body?.USER_ID) {
      return res.status(400).json({
        success: false,
        message: "P_NAME and USER_ID are required.",
      });
    }

    const P_ID = await insertProject(body, req.files ?? []);
    return res.status(201).json({ success: true, message: "Project created.", P_ID });
  }

  

  // ── GET  ─────────────────────────────────────
  if (req.method === "GET") {
    const p_id = Number(req.query.p_id || 0);

    // req.user is populated only if protectRoute middleware runs (not yet enabled here).
    // Falls back to query params for now — INSECURE, dev-only until middleware is added.
    const userType = req.user?.userType || req.query.userType;
    const ownerId  = req.user?.refId    || req.query.ownerId;

    const filter = userType === "OWNER" ? { ownerId } : {}; // Admin/others → no filter

    const data = await searchProject(p_id, filter);

    if (p_id > 0 && !data.length) {
      return res.status(404).json({
        success: false,
        message: `Project with ID ${p_id} not found.`,
      });
    }
    return res.json({ success: true, count: data.length, data });
  }
  // ── PUT  ─────────────────────────────────────
  if (req.method === "PUT") {
    try {
      await runUpload(req, res);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const body = req.body;
    if (!body?.P_ID || !body?.UPDATED_BY) {
      return res.status(400).json({
        success: false,
        message: "P_ID and UPDATED_BY are required for update.",
      });
    }

    const rows = await updateProject(body, req.files ?? []);
    if (!rows) {
      return res.status(404).json({
        success: false,
        message: `Project with ID ${body.P_ID} not found or no changes made.`,
      });
    }
    return res.json({
      success: true,
      message: `Project ${body.P_ID} updated successfully.`,
    });
  }

  // ── DELETE  ──────────────────────────────────
  // if (req.method === "DELETE") {
  //   if (!req.body?.P_ID) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "P_ID is required for deletion.",
  //     });
  //   }
  //   const rows = await deleteProject(req.body.P_ID);
  //   if (!rows) {
  //     return res.status(404).json({
  //       success: false,
  //       message: `Project with ID ${req.body.P_ID} not found.`,
  //     });
  //   }
  //   return res.json({
  //     success: true,
  //     message: `Project ${req.body.P_ID} deleted successfully.`,
  //   });
  // }
  if (req.method === "DELETE") {
  const p_id = Number(req.params.id || 0);
  if (!p_id || p_id <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid project ID is required for deletion.",
    });
  }
  const rows = await deleteProject(p_id);
  if (!rows) {
    return res.status(404).json({
      success: false,
      message: `Project with ID ${p_id} not found.`,
    });
  }
  return res.json({
    success: true,
    message: `Project ${p_id} deleted successfully.`,
  });
}

  return res.status(405).json({ success: false, message: "Method not supported." });
}

// ─────────────────────────────────────────────
// FILE DOWNLOAD HANDLER
// GET /project/doc/:id  → BLOB কে stream করে browser এ পাঠায়
// ─────────────────────────────────────────────
export async function handleDocDownload(req, res) {
  const doc_id = Number(req.params.id || 0);
  if (!doc_id) {
    return res.status(400).json({ success: false, message: "doc id is required." });
  }

  const doc = await getDocBlob(doc_id);
  if (!doc || !doc.buffer) {
    return res.status(404).json({ success: false, message: "Document not found." });
  }

  res.setHeader("Content-Type",        doc.mimeType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${doc.fileName ?? "file"}"`);
  res.setHeader("Content-Length",      doc.buffer.length);
  res.end(doc.buffer);
}

// ─────────────────────────────────────────────
// controller.js এ এই import + ফাংশন যুক্ত করুন
// ─────────────────────────────────────────────

// imports এর মধ্যে uploadCertificateDoc যুক্ত করুন:
// import {
//   insertProject,
//   searchProject,
//   updateProject,
//   deleteProject,
//   getDocBlob,
//   uploadCertificateDoc,   // ← নতুন
// } from "./service.js";

// ─────────────────────────────────────────────
// Certificate উপলোডের জন্য আলাদা multer instance
// field name: CERTIFICATE_FILE, শুধুমাত্র ১টা ফাইল
// ─────────────────────────────────────────────
const uploadCertificate = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter(_req, file, cb) {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type "${file.mimetype}" is not allowed.`));
  },
}).single("CERTIFICATE_FILE"); // field name: CERTIFICATE_FILE

function runCertificateUpload(req, res) {
  return new Promise((resolve, reject) =>
    uploadCertificate(req, res, (err) => (err ? reject(err) : resolve()))
  );
}

// ─────────────────────────────────────────────
// CERTIFICATE UPLOAD HANDLER
// PUT /project/doc/:id/upload   (multipart/form-data, field: CERTIFICATE_FILE)
// ─────────────────────────────────────────────
export async function handleCertificateUpload(req, res) {
  const doc_id = Number(req.params.id || 0);
  if (!doc_id) {
    return res.status(400).json({ success: false, message: "doc id is required." });
  }

  try {
    await runCertificateUpload(req, res);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Use field name CERTIFICATE_FILE.",
    });
  }

  const updated_by = Number(req.body?.UPDATED_BY || 0);

  const result = await uploadCertificateDoc(doc_id, req.file, updated_by);

  if (!result) {
    return res.status(404).json({
      success: false,
      message: "Certificate not found, already uploaded, or invalid doc id.",
    });
  }

  return res.json({
    success: true,
    message: "Certificate uploaded successfully.",
    P_ID: result.P_ID,
    DOC_ID: result.ID,
  });
}

// controller.js — notun handler


export async function handleNotifyContractors(req, res) {
  const { CONTRACTOR_IDS, SUBJECT, MESSAGE, P_ID } = req.body;
  if (!Array.isArray(CONTRACTOR_IDS) || !CONTRACTOR_IDS.length || !SUBJECT || !MESSAGE) {
    return res.status(400).json({
      success: false,
      message: "CONTRACTOR_IDS (array), SUBJECT and MESSAGE are required.",
    });
  }
  const result = await sendBulkEmailToContractors({ CONTRACTOR_IDS, SUBJECT, MESSAGE, P_ID });
  if (!result.total) {
    return res.status(404).json({ success: false, message: "No contractor emails found." });
  }
  if (result.failed > 0) {
  return res.status(500).json({
    success: false,
    message: `Failed to send ${result.failed} email(s).`,
    ...result,
  });
}

return res.json({
  success: true,
  message: `Sent ${result.sent}/${result.total} emails.`,
  ...result,
});
}

// ─────────────────────────────────────────────
// PATCH /project/:id/move
// Body: { direction: "up" | "down" }
// ─────────────────────────────────────────────
export async function handleMoveProject(req, res) {
  const p_id = Number(req.params.id);
  if (!p_id || p_id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid project ID." });
  }

  const { direction } = req.body;
  if (direction !== "up" && direction !== "down") {
    return res.status(400).json({
      success: false,
      message: "direction must be 'up' or 'down'.",
    });
  }

  const result = await moveProject(p_id, direction);
  return res.json({
    success: true,
    message: "Project position updated successfully.",
    data: result,
  });
}

// ─────────────────────────────────────────────
// PATCH /project/:id/reorder
// Body: { newPosition: number }
// ─────────────────────────────────────────────
export async function handleReorderProject(req, res) {
  const p_id = Number(req.params.id);
  if (!p_id || p_id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid project ID." });
  }

  const { newPosition } = req.body;
  if (!newPosition || Number(newPosition) <= 0) {
    return res.status(400).json({
      success: false,
      message: "newPosition must be a positive number.",
    });
  }

  const result = await reorderProject(p_id, Number(newPosition));
  return res.json({
    success: true,
    message: "Project reordered successfully.",
    data: result,
  });
}

// ─────────────────────────────────────────────
// PATCH /project/:id/status
// Body: { PROJECT_STATUS: "RUNNING" | "COMPLETED" | "ON_HOLD" | "CANCELLED", UPDATED_BY?: number }
// ─────────────────────────────────────────────
export async function handleUpdateProjectStatus(req, res) {
  const p_id = Number(req.params.id);
  if (!p_id || p_id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid project ID." });
  }

  const { PROJECT_STATUS, UPDATED_BY } = req.body;
  
  if (!PROJECT_STATUS) {
    return res.status(400).json({
      success: false,
      message: "PROJECT_STATUS is required.",
    });
  }

  // Optional safety check: ensure it's a valid status
  const allowedStatuses = ["RUNNING", "COMPLETED", "ON_HOLD", "CANCELLED", "DRAFT"];
  if (!allowedStatuses.includes(PROJECT_STATUS)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
    });
  }

  const updated_by = Number(UPDATED_BY || 0);

  try {
    const rowsAffected = await updateProjectStatus(p_id, PROJECT_STATUS, updated_by);
    
    if (rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    return res.json({
      success: true,
      message: "Project status updated successfully.",
    });
  } catch (err) {
    console.error("Status update error:", err);
    return res.status(500).json({ success: false, message: "Failed to update project status." });
  }
}


// ─────────────────────────────────────────────
// PATCH /project/:id/margin
// Body: { MARGIN_PERCENT: number, UPDATED_BY?: number }
// ─────────────────────────────────────────────
export async function handleUpdateProjectMargin(req, res) {
  const p_id = Number(req.params.id);
  if (!p_id || p_id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid project ID." });
  }

  const { MARGIN_PERCENT, UPDATED_BY } = req.body;

  if (MARGIN_PERCENT === undefined || MARGIN_PERCENT === null || isNaN(Number(MARGIN_PERCENT))) {
    return res.status(400).json({
      success: false,
      message: "MARGIN_PERCENT must be a number.",
    });
  }

  const margin = Number(MARGIN_PERCENT);
  if (margin < 0 || margin > 100) {
    return res.status(400).json({
      success: false,
      message: "MARGIN_PERCENT must be between 0 and 100.",
    });
  }

  const updated_by = Number(UPDATED_BY || 0);

  try {
    const rowsAffected = await updateProjectMargin(p_id, margin, updated_by);

    if (rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    return res.json({
      success: true,
      message: "Project margin updated successfully.",
    });
  } catch (err) {
    console.error("Margin update error:", err);
    return res.status(500).json({ success: false, message: "Failed to update project margin." });
  }
}
