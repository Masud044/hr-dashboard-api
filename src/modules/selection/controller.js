// src/modules/selection/controller.js
import multer from "multer";
import {
  listForms,
  createForm,
  getFormById,
  updateForm,
  deleteForm,
  createArea,
  updateArea,
  deleteArea,
  createItem,
  updateItem,
  deleteItem,
  addFile,
  getFileBlob,
  deleteFile,
  copyForm,
  copyArea,
  publishForm,
  reopenForm,
  confirmItem,
  confirmAll,
} from "./service.js";

// ─────────────────────────────────────────────
// Multer — memoryStorage (file content → Buffer → BLOB)
// ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter(_req, file, cb) {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type "${file.mimetype}" is not allowed.`));
  },
}).single("file");

function runUpload(req, res) {
  return new Promise((resolve, reject) =>
    upload(req, res, (err) => (err ? reject(err) : resolve())),
  );
}

function uploadErrorMessage(err) {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return "File is too large. Maximum allowed size is 5 MB.";
  }
  return err?.message || "File upload failed.";
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function _positiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function _has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

function _userId(req) {
  return (
    Number(
      req.user?.id ??
        req.body?.UPDATED_BY ??
        req.body?.CREATED_BY ??
        req.body?.USER_ID ??
        req.query?.userId ??
        req.query?.UPDATED_BY ??
        0,
    ) || 0
  );
}

function _isNumber(value) {
  if (value === undefined || value === null || value === "") return false;
  return !Number.isNaN(Number(value));
}

function _ownerId(req) {
  const userType = req.user?.userType || req.query.userType;
  if (userType !== "OWNER") return null;

  const ownerId = Number(req.user?.refId ?? req.query.ownerId ?? 0);
  return Number.isInteger(ownerId) && ownerId > 0 ? ownerId : 0;
}

export function guardOwnerWrite(req, res, next) {
  const userType = req.user?.userType || req.query.userType;
  if (userType === "OWNER") {
    return res.status(403).json({
      success: false,
      message: "Owners are not allowed to perform this action.",
    });
  }
  return next();
}

// ─────────────────────────────────────────────
// FORMS
// ─────────────────────────────────────────────
export async function handleListForms(req, res) {
  const rawProjectId = req.query.projectId;
  let projectId = null;

  if (rawProjectId !== undefined && rawProjectId !== "" && rawProjectId !== null) {
    projectId = _positiveInt(rawProjectId);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId must be a positive number.",
      });
    }
  }

  const templates = String(req.query.templates ?? "").toUpperCase() === "Y";
  const data = await listForms({
    projectId,
    templates,
    ownerId: _ownerId(req),
  });

  return res.json({ success: true, count: data.length, data });
}

export async function handleCreateForm(req, res) {
  const body = req.body ?? {};
  const title = typeof body.TITLE === "string" ? body.TITLE.trim() : "";

  if (!title) {
    return res.status(400).json({
      success: false,
      message: "TITLE is required.",
    });
  }
  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      message: "TITLE must be 200 characters or fewer.",
    });
  }

  let pId = null;
  if (body.P_ID !== undefined && body.P_ID !== null && body.P_ID !== "") {
    pId = _positiveInt(body.P_ID);
    if (!pId) {
      return res.status(400).json({
        success: false,
        message: "P_ID must be a positive number.",
      });
    }
  }

  let levelNo = null;
  if (body.LEVEL_NO !== undefined && body.LEVEL_NO !== null) {
    levelNo = String(body.LEVEL_NO).trim();
    if (levelNo.length > 20) {
      return res.status(400).json({
        success: false,
        message: "LEVEL_NO must be 20 characters or fewer.",
      });
    }
    if (!levelNo) levelNo = null;
  }

  let isTemplate = "N";
  if (body.IS_TEMPLATE !== undefined && body.IS_TEMPLATE !== null) {
    isTemplate = String(body.IS_TEMPLATE).toUpperCase();
    if (isTemplate !== "Y" && isTemplate !== "N") {
      return res.status(400).json({
        success: false,
        message: "IS_TEMPLATE must be 'Y' or 'N'.",
      });
    }
  }

  const data = await createForm(
    { P_ID: pId, TITLE: title, LEVEL_NO: levelNo, IS_TEMPLATE: isTemplate },
    _userId(req),
  );

  return res.status(201).json({
    success: true,
    message: "Selection form created.",
    data,
  });
}

export async function handleGetForm(req, res) {
  const formId = _positiveInt(req.params.id);
  if (!formId) {
    return res.status(400).json({
      success: false,
      message: "A valid form id is required.",
    });
  }

  const data = await getFormById(formId, _ownerId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection form with ID ${formId} not found.`,
    });
  }

  return res.json({ success: true, data });
}

export async function handleUpdateForm(req, res) {
  const formId = _positiveInt(req.params.id);
  if (!formId) {
    return res.status(400).json({
      success: false,
      message: "A valid form id is required.",
    });
  }

  const body = req.body ?? {};
  const update = {};

  if (_has(body, "TITLE")) {
    const title = typeof body.TITLE === "string" ? body.TITLE.trim() : "";
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "TITLE cannot be empty.",
      });
    }
    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: "TITLE must be 200 characters or fewer.",
      });
    }
    update.TITLE = title;
  }

  if (_has(body, "LEVEL_NO")) {
    let levelNo = body.LEVEL_NO;
    if (levelNo !== null && levelNo !== undefined) {
      levelNo = String(levelNo).trim();
      if (levelNo.length > 20) {
        return res.status(400).json({
          success: false,
          message: "LEVEL_NO must be 20 characters or fewer.",
        });
      }
      if (!levelNo) levelNo = null;
    }
    update.LEVEL_NO = levelNo ?? null;
  }

  if (!Object.keys(update).length) {
    return res.status(400).json({
      success: false,
      message: "TITLE or LEVEL_NO is required for update.",
    });
  }

  const data = await updateForm(formId, update, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection form with ID ${formId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: `Selection form ${formId} updated successfully.`,
    data,
  });
}

export async function handleDeleteForm(req, res) {
  const formId = _positiveInt(req.params.id);
  if (!formId) {
    return res.status(400).json({
      success: false,
      message: "A valid form id is required.",
    });
  }

  const deleted = await deleteForm(formId);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: `Selection form with ID ${formId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: `Selection form ${formId} deleted successfully.`,
  });
}

// ─────────────────────────────────────────────
// AREAS
// ─────────────────────────────────────────────
export async function handleCreateArea(req, res) {
  const formId = _positiveInt(req.params.id);
  if (!formId) {
    return res.status(400).json({
      success: false,
      message: "A valid form id is required.",
    });
  }

  const body = req.body ?? {};
  const name = typeof body.NAME === "string" ? body.NAME.trim() : "";
  if (!name) {
    return res.status(400).json({
      success: false,
      message: "NAME is required.",
    });
  }
  if (name.length > 200) {
    return res.status(400).json({
      success: false,
      message: "NAME must be 200 characters or fewer.",
    });
  }

  let parentId = null;
  if (body.PARENT_ID !== undefined && body.PARENT_ID !== null && body.PARENT_ID !== "") {
    parentId = _positiveInt(body.PARENT_ID);
    if (!parentId) {
      return res.status(400).json({
        success: false,
        message: "PARENT_ID must be a positive number.",
      });
    }
  }

  const data = await createArea(
    formId,
    { NAME: name, PARENT_ID: parentId, FIELDS_JSON: body.FIELDS_JSON },
    _userId(req),
  );
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection form with ID ${formId} not found.`,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Selection area created.",
    data,
  });
}

export async function handleUpdateArea(req, res) {
  const areaId = _positiveInt(req.params.areaId);
  if (!areaId) {
    return res.status(400).json({
      success: false,
      message: "A valid area id is required.",
    });
  }

  const body = req.body ?? {};
  const update = {};

  if (_has(body, "NAME")) {
    const name = typeof body.NAME === "string" ? body.NAME.trim() : "";
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "NAME cannot be empty.",
      });
    }
    if (name.length > 200) {
      return res.status(400).json({
        success: false,
        message: "NAME must be 200 characters or fewer.",
      });
    }
    update.NAME = name;
  }

  if (_has(body, "FIELDS_JSON")) {
    update.FIELDS_JSON = body.FIELDS_JSON;
  }

  if (_has(body, "SORT_ORDER")) {
    if (!_isNumber(body.SORT_ORDER)) {
      return res.status(400).json({
        success: false,
        message: "SORT_ORDER must be a number.",
      });
    }
    update.SORT_ORDER = Number(body.SORT_ORDER);
  }

  if (!Object.keys(update).length) {
    return res.status(400).json({
      success: false,
      message: "NAME, FIELDS_JSON or SORT_ORDER is required for update.",
    });
  }

  const data = await updateArea(areaId, update, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection area with ID ${areaId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: `Selection area ${areaId} updated successfully.`,
    data,
  });
}

export async function handleDeleteArea(req, res) {
  const areaId = _positiveInt(req.params.areaId);
  if (!areaId) {
    return res.status(400).json({
      success: false,
      message: "A valid area id is required.",
    });
  }

  const deleted = await deleteArea(areaId, _userId(req));
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: `Selection area with ID ${areaId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: `Selection area ${areaId} deleted successfully.`,
  });
}

// ─────────────────────────────────────────────
// ITEMS
// ─────────────────────────────────────────────
export async function handleCreateItem(req, res) {
  const areaId = _positiveInt(req.params.areaId);
  if (!areaId) {
    return res.status(400).json({
      success: false,
      message: "A valid area id is required.",
    });
  }

  const data = await createItem(areaId, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection area with ID ${areaId} not found.`,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Selection item created.",
    data,
  });
}

export async function handleUpdateItem(req, res) {
  const itemId = _positiveInt(req.params.itemId);
  if (!itemId) {
    return res.status(400).json({
      success: false,
      message: "A valid item id is required.",
    });
  }

  const body = req.body ?? {};
  const update = {};

  if (_has(body, "VALUES_JSON")) {
    update.VALUES_JSON = body.VALUES_JSON;
  }

  if (_has(body, "SORT_ORDER")) {
    if (!_isNumber(body.SORT_ORDER)) {
      return res.status(400).json({
        success: false,
        message: "SORT_ORDER must be a number.",
      });
    }
    update.SORT_ORDER = Number(body.SORT_ORDER);
  }

  if (!Object.keys(update).length) {
    return res.status(400).json({
      success: false,
      message: "VALUES_JSON or SORT_ORDER is required for update.",
    });
  }

  const data = await updateItem(itemId, update, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection item with ID ${itemId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: `Selection item ${itemId} updated successfully.`,
    data,
  });
}

export async function handleDeleteItem(req, res) {
  const itemId = _positiveInt(req.params.itemId);
  if (!itemId) {
    return res.status(400).json({
      success: false,
      message: "A valid item id is required.",
    });
  }

  const deleted = await deleteItem(itemId, _userId(req));
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: `Selection item with ID ${itemId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: `Selection item ${itemId} deleted successfully.`,
  });
}

// ─────────────────────────────────────────────
// FILES
// ─────────────────────────────────────────────
export async function handleUploadFile(req, res) {
  const itemId = _positiveInt(req.params.itemId);
  if (!itemId) {
    return res.status(400).json({
      success: false,
      message: "A valid item id is required.",
    });
  }

  try {
    await runUpload(req, res);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: uploadErrorMessage(err),
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Use field name "file".',
    });
  }

  const fieldKey =
    typeof req.body?.FIELD_KEY === "string" ? req.body.FIELD_KEY.trim() : "";
  if (!fieldKey) {
    return res.status(400).json({
      success: false,
      message: "FIELD_KEY is required.",
    });
  }
  if (fieldKey.length > 100) {
    return res.status(400).json({
      success: false,
      message: "FIELD_KEY must be 100 characters or fewer.",
    });
  }

  const data = await addFile(itemId, req.file, fieldKey, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection item with ID ${itemId} not found.`,
    });
  }

  return res.status(201).json({
    success: true,
    message: "File uploaded successfully.",
    data,
  });
}

export async function handleFileDownload(req, res) {
  const fileId = _positiveInt(req.params.fileId);
  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: "A valid file id is required.",
    });
  }

  const file = await getFileBlob(fileId, _ownerId(req));
  if (!file || !file.buffer) {
    return res.status(404).json({
      success: false,
      message: "File not found.",
    });
  }

  const fileName = String(file.fileName ?? "file").replace(/"/g, "");

  res.setHeader("Content-Type", file.mimeType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.setHeader("Content-Length", file.buffer.length);
  res.end(file.buffer);
}

export async function handleDeleteFile(req, res) {
  const fileId = _positiveInt(req.params.fileId);
  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: "A valid file id is required.",
    });
  }

  const deleted = await deleteFile(fileId, _userId(req));
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: `File with ID ${fileId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: `File ${fileId} deleted successfully.`,
  });
}

// ─────────────────────────────────────────────
// COPY
// ─────────────────────────────────────────────
export async function handleCopyForm(req, res) {
  const formId = _positiveInt(req.params.id);
  if (!formId) {
    return res.status(400).json({
      success: false,
      message: "A valid form id is required.",
    });
  }

  const body = req.body ?? {};
  const options = {};

  if (_has(body, "P_ID")) {
    if (body.P_ID === null || body.P_ID === "" || body.P_ID === undefined) {
      options.P_ID = null;
    } else {
      const pId = _positiveInt(body.P_ID);
      if (!pId) {
        return res.status(400).json({
          success: false,
          message: "P_ID must be a positive number.",
        });
      }
      options.P_ID = pId;
    }
  }

  if (_has(body, "TITLE")) {
    const title = typeof body.TITLE === "string" ? body.TITLE.trim() : "";
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "TITLE cannot be empty.",
      });
    }
    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: "TITLE must be 200 characters or fewer.",
      });
    }
    options.TITLE = title;
  }

  if (_has(body, "LEVEL_NO")) {
    let levelNo = body.LEVEL_NO;
    if (levelNo !== null && levelNo !== undefined) {
      levelNo = String(levelNo).trim();
      if (levelNo.length > 20) {
        return res.status(400).json({
          success: false,
          message: "LEVEL_NO must be 20 characters or fewer.",
        });
      }
      if (!levelNo) levelNo = null;
    }
    options.LEVEL_NO = levelNo ?? null;
  }

  if (_has(body, "IS_TEMPLATE")) {
    const isTemplate = String(body.IS_TEMPLATE ?? "").toUpperCase();
    if (isTemplate !== "Y" && isTemplate !== "N") {
      return res.status(400).json({
        success: false,
        message: "IS_TEMPLATE must be 'Y' or 'N'.",
      });
    }
    options.IS_TEMPLATE = isTemplate;
  }

  if (_has(body, "COPY_FILES")) {
    const copyFiles = String(body.COPY_FILES ?? "").toUpperCase();
    if (copyFiles !== "Y" && copyFiles !== "N") {
      return res.status(400).json({
        success: false,
        message: "COPY_FILES must be 'Y' or 'N'.",
      });
    }
    options.COPY_FILES = copyFiles;
  }

  const data = await copyForm(formId, options, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection form with ID ${formId} not found.`,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Selection form copied.",
    data,
  });
}

export async function handleCopyArea(req, res) {
  const areaId = _positiveInt(req.params.areaId);
  if (!areaId) {
    return res.status(400).json({
      success: false,
      message: "A valid area id is required.",
    });
  }

  const body = req.body ?? {};
  const options = {};

  if (_has(body, "COPY_FILES")) {
    const copyFiles = String(body.COPY_FILES ?? "").toUpperCase();
    if (copyFiles !== "Y" && copyFiles !== "N") {
      return res.status(400).json({
        success: false,
        message: "COPY_FILES must be 'Y' or 'N'.",
      });
    }
    options.COPY_FILES = copyFiles;
  }

  const data = await copyArea(areaId, options, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection area with ID ${areaId} not found.`,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Selection area copied.",
    data,
  });
}

// ─────────────────────────────────────────────
// FORM STATUS ACTIONS
// ─────────────────────────────────────────────
export async function handlePublishForm(req, res) {
  const formId = _positiveInt(req.params.id);
  if (!formId) {
    return res.status(400).json({
      success: false,
      message: "A valid form id is required.",
    });
  }

  const data = await publishForm(formId, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection form with ID ${formId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: "Selection form published.",
    data,
  });
}

export async function handleReopenForm(req, res) {
  const formId = _positiveInt(req.params.id);
  if (!formId) {
    return res.status(400).json({
      success: false,
      message: "A valid form id is required.",
    });
  }

  const data = await reopenForm(formId, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection form with ID ${formId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: "Selection form reopened.",
    data,
  });
}

// ─────────────────────────────────────────────
// CUSTOMER ACTIONS
// ─────────────────────────────────────────────
export async function handleConfirmItem(req, res) {
  const itemId = _positiveInt(req.params.itemId);
  if (!itemId) {
    return res.status(400).json({
      success: false,
      message: "A valid item id is required.",
    });
  }

  const body = req.body ?? {};
  const confirmed = String(body.CUSTOMER_CONFIRMED ?? "").toUpperCase();
  if (confirmed !== "Y" && confirmed !== "N") {
    return res.status(400).json({
      success: false,
      message: "CUSTOMER_CONFIRMED must be 'Y' or 'N'.",
    });
  }

  const update = { CUSTOMER_CONFIRMED: confirmed };

  if (_has(body, "CUSTOMER_NOTE")) {
    const note = body.CUSTOMER_NOTE;
    if (note !== null && note !== undefined) {
      if (typeof note !== "string") {
        return res.status(400).json({
          success: false,
          message: "CUSTOMER_NOTE must be a string.",
        });
      }
      if (note.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "CUSTOMER_NOTE must be 1000 characters or fewer.",
        });
      }
      update.CUSTOMER_NOTE = note;
    } else {
      update.CUSTOMER_NOTE = null;
    }
  }

  const data = await confirmItem(itemId, update);
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection item with ID ${itemId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: "Customer confirmation updated.",
    data,
  });
}

export async function handleConfirmAll(req, res) {
  const formId = _positiveInt(req.params.id);
  if (!formId) {
    return res.status(400).json({
      success: false,
      message: "A valid form id is required.",
    });
  }

  const data = await confirmAll(formId, _userId(req));
  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Selection form with ID ${formId} not found.`,
    });
  }

  return res.json({
    success: true,
    message: "Selection form confirmed.",
    data,
  });
}
