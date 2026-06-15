import * as projectNoteService from "./service.js";

/**
 * GET /api/project-note?pId=123&contractorTypeIds=1,2,3
 */
export async function getNotes(req, res, next) {
  try {
    const { pId, contractorTypeIds } = req.query;

    if (!pId) {
      return res.status(400).json({ message: "pId is required" });
    }

    let ctIds;
    if (contractorTypeIds) {
      ctIds = String(contractorTypeIds)
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id));
    }

    const notes = await projectNoteService.getNotesByProject(
      Number(pId),
      ctIds
    );

    return res.status(200).json({ data: notes });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/project-note/:noteId
 */
export async function getNote(req, res, next) {
  try {
    const { noteId } = req.params;

    const note = await projectNoteService.getNoteById(Number(noteId));

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    return res.status(200).json({ data: note });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/project-note/doc/:docId
 * Streams the BLOB file back to the client.
 */
export async function getDoc(req, res, next) {
  try {
    const { docId } = req.params;

    const doc = await projectNoteService.getDocById(Number(docId));

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.setHeader(
      "Content-Type",
      doc.CONTENT_TYPE || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(doc.FILE_NAME || "file")}"`
    );

    return res.send(doc.DOC_FILE);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/project-note  (multipart/form-data, field "files" - multiple allowed)
 * body: { pId, description, createdBy, contractorTypeIds }
 */
export async function createNote(req, res, next) {
  try {
    const { pId, description, createdBy, contractorTypeIds } = req.body;

    let parsedContractorTypeIds = contractorTypeIds;
    if (typeof contractorTypeIds === "string") {
      try {
        parsedContractorTypeIds = JSON.parse(contractorTypeIds);
      } catch {
        parsedContractorTypeIds = contractorTypeIds
          .split(",")
          .map((id) => id.trim());
      }
    }

    if (!pId || !description || !createdBy) {
      return res.status(400).json({
        message: "pId, description and createdBy are required",
      });
    }

    if (
      !Array.isArray(parsedContractorTypeIds) ||
      parsedContractorTypeIds.length === 0
    ) {
      return res.status(400).json({
        message: "contractorTypeIds must be a non-empty array",
      });
    }

    const note = await projectNoteService.createNote({
      pId: Number(pId),
      description,
      createdBy: Number(createdBy),
      contractorTypeIds: parsedContractorTypeIds.map(Number),
      files: req.files || [],
    });

    return res.status(201).json({ data: note });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/project-note/:noteId (multipart/form-data, field "files" - multiple allowed)
 * body: { description?, contractorTypeIds?, createdBy? }
 */
export async function updateNote(req, res, next) {
  try {
    const { noteId } = req.params;
    const { description, contractorTypeIds, createdBy } = req.body;

    let parsedContractorTypeIds = contractorTypeIds;
    if (typeof contractorTypeIds === "string") {
      try {
        parsedContractorTypeIds = JSON.parse(contractorTypeIds);
      } catch {
        parsedContractorTypeIds = contractorTypeIds
          .split(",")
          .map((id) => id.trim());
      }
    }

    const existing = await projectNoteService.getNoteById(Number(noteId));
    if (!existing) {
      return res.status(404).json({ message: "Note not found" });
    }

    const note = await projectNoteService.updateNote(Number(noteId), {
      description,
      contractorTypeIds: Array.isArray(parsedContractorTypeIds)
        ? parsedContractorTypeIds.map(Number)
        : undefined,
      files: req.files || [],
      createdBy: createdBy ? Number(createdBy) : existing.CREATED_BY,
    });

    return res.status(200).json({ data: note });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/project-note/:noteId
 */
export async function deleteNote(req, res, next) {
  try {
    const { noteId } = req.params;

    const existing = await projectNoteService.getNoteById(Number(noteId));
    if (!existing) {
      return res.status(404).json({ message: "Note not found" });
    }

    await projectNoteService.deleteNote(Number(noteId));

    return res.status(200).json({ message: "Note deleted successfully" });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/project-note/doc/:docId
 */
export async function deleteDoc(req, res, next) {
  try {
    const { docId } = req.params;

    const deleted = await projectNoteService.deleteDoc(Number(docId));

    if (!deleted) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json({ message: "Document deleted successfully" });
  } catch (err) {
    return next(err);
  }
}