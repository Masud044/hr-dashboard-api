import {
  getAllContractorTypeInfo,
  getContractorTypeInfoById,
  getContractorTypeInfoByContractorId,
  createContractorTypeInfo,
  updateContractorTypeInfo,
  deleteContractorTypeInfo,
  getAllContractorTypes,
  getAllContractors,
} from "./service.js";

// ─── PM_CONTRACTOR_TYPE_INFO controllers ─────────────────────────────────────

export async function getAll(req, res, next) {
  try {
    const data = await getAllContractorTypeInfo();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const row = await getContractorTypeInfoById(Number(id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
}

export async function getByContractorId(req, res, next) {
  try {
    const { contractorId } = req.params;
    const data = await getContractorTypeInfoByContractorId(Number(contractorId));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { contructorId, contructorType, createdBy, updateBy } = req.body;

    if (!contructorId) {
      return res
        .status(400)
        .json({ success: false, message: "contructorId is required" });
    }
    if (!contructorType) {
      return res
        .status(400)
        .json({ success: false, message: "contructorType is required" });
    }

    const result = await createContractorTypeInfo({
      contructorId,
      contructorType,
      createdBy,
      updateBy,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { contructorId, contructorType, updateBy } = req.body;

    const affected = await updateContractorTypeInfo(Number(id), {
      contructorId,
      contructorType,
      updateBy,
    });

    if (!affected) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json({ success: true, message: "Updated successfully" });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const affected = await deleteContractorTypeInfo(Number(id));

    if (!affected) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
}

// ─── Lookup dropdown controllers ─────────────────────────────────────────────

/** PM_CONTRACTOR_TYPE dropdown */
export async function getContractorTypes(req, res, next) {
  try {
    const data = await getAllContractorTypes();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** PM_CONTRACTOR_INFO dropdown */
export async function getContractors(req, res, next) {
  try {
    const data = await getAllContractors();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}