import multer from "multer";
import {
  insertInvoice,
  searchInvoices,
  getInvoiceById,
  getInvoiceReceipt,
  updateInvoice,
  deleteInvoice,
} from "./service.js";

function toNullableNumber(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type "${file.mimetype}" is not allowed.`));
  },
}).single("RECEIPT");

function runUpload(req, res) {
  return new Promise((resolve, reject) =>
    upload(req, res, (err) => (err ? reject(err) : resolve()))
  );
}

export async function handleCreateInvoice(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not supported." });
  }

  try {
    await runUpload(req, res);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  const body = req.body;
  if (!body?.PROJECT_ID || !body?.AREA_TYPE || !body?.AMOUNT || !body?.PURCHASED_BY || !body?.PAYMENT_METHOD) {
    return res.status(400).json({
      success: false,
      message: "PROJECT_ID, AREA_TYPE, AMOUNT, PURCHASED_BY and PAYMENT_METHOD are required.",
    });
  }

  const invoiceId = await insertInvoice(body, req.file ?? null);
  return res.status(201).json({ success: true, message: "Invoice created.", ID: invoiceId });
}

// export async function handleListInvoices(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ success: false, message: "Method not supported." });
//   }

//   const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
//   const page = req.query.page ? Number(req.query.page) : 1;
//   const limit = req.query.limit ? Number(req.query.limit) : 20;

//   const data = await searchInvoices({ projectId, page, limit });
//   return res.json({ success: true, count: data.length, data });
// }
export async function handleListInvoices(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not supported." });
  }

  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;

  const { rows, total, totalPages } = await searchInvoices({ projectId, page, limit });
  return res.json({
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages },
  });
}

export async function handleGetInvoice(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not supported." });
  }

  const id = Number(req.params.id || 0);
  if (!id || id <= 0) {
    return res.status(400).json({ success: false, message: "A valid invoice ID is required." });
  }

  const data = await getInvoiceById(id);
  if (!data) {
    return res.status(404).json({ success: false, message: "Invoice not found." });
  }

  return res.json({ success: true, data });
}

export async function handleGetReceipt(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not supported." });
  }

  const id = Number(req.params.id || 0);
  if (!id || id <= 0) {
    return res.status(400).json({ success: false, message: "A valid invoice ID is required." });
  }

  const receipt = await getInvoiceReceipt(id);
  if (!receipt || !receipt.buffer) {
    return res.status(404).json({ success: false, message: "Receipt not found." });
  }

  res.setHeader("Content-Type", receipt.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${receipt.fileName || "receipt"}"`);
  res.setHeader("Content-Length", receipt.buffer.length);
  res.end(receipt.buffer);
}

export async function handleUpdateInvoice(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ success: false, message: "Method not supported." });
  }

  try {
    await runUpload(req, res);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  const id = Number(req.params.id || 0);
  if (!id || id <= 0) {
    return res.status(400).json({ success: false, message: "A valid invoice ID is required." });
  }

  const body = req.body || {};
const payload = {
  PROJECT_ID: toNullableNumber(body.PROJECT_ID),
  AREA_TYPE: body.AREA_TYPE !== undefined ? body.AREA_TYPE : undefined,
  AMOUNT: toNullableNumber(body.AMOUNT),
  PURCHASED_BY: body.PURCHASED_BY !== undefined ? body.PURCHASED_BY : undefined,
  CONTRACTOR_ID: toNullableNumber(body.CONTRACTOR_ID),
  MATERIAL_TYPE: body.MATERIAL_TYPE !== undefined ? body.MATERIAL_TYPE : undefined,
  MATERIAL_OTHER: body.MATERIAL_OTHER !== undefined ? body.MATERIAL_OTHER : undefined,
  PAYMENT_METHOD: body.PAYMENT_METHOD !== undefined ? body.PAYMENT_METHOD : undefined,
  PAYMENT_REF: body.PAYMENT_REF !== undefined ? body.PAYMENT_REF : undefined,
  // STATUS removed — never settable directly
  CREATED_BY: toNullableNumber(body.CREATED_BY),
};

  const rows = await updateInvoice(id, payload, req.file ?? null);
  if (!rows) {
    return res.status(404).json({ success: false, message: "Invoice not found or no changes made." });
  }

  return res.json({ success: true, message: "Invoice updated successfully." });
}

export async function handleDeleteInvoice(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ success: false, message: "Method not supported." });
  }

  const id = Number(req.params.id || 0);
  if (!id || id <= 0) {
    return res.status(400).json({ success: false, message: "A valid invoice ID is required." });
  }

  const rows = await deleteInvoice(id);
  if (!rows) {
    return res.status(404).json({ success: false, message: "Invoice not found." });
  }

  return res.json({ success: true, message: "Invoice deleted successfully." });
}
