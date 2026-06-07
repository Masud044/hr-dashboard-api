import {
  getAllOwnerInfo,
  getOwnerInfoById,
  getOwnerInfoByProjectId,
  createOwnerInfo,
  updateOwnerInfo,
  deleteOwnerInfo,
  getAllProjects,
} from "./service.js";

// ─── PM_OWNER_INFO controllers ────────────────────────────────────────────────

export async function getAll(req, res, next) {
  try {
    const data = await getAllOwnerInfo();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const row = await getOwnerInfoById(Number(id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
}

export async function getByProjectId(req, res, next) {
  try {
    const { projectId } = req.params;
    const data = await getOwnerInfoByProjectId(Number(projectId));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const {
      oName,
      address,
      suburb,
      postcode,
      state,
      email,
      phone,
      projectId,
      createdBy,
      updatedBy,
    } = req.body;

    if (!oName) {
      return res
        .status(400)
        .json({ success: false, message: "oName (owner name) is required" });
    }

    const result = await createOwnerInfo({
      oName,
      address,
      suburb,
      postcode,
      state,
      email,
      phone,
      projectId,
      createdBy,
      updatedBy,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const {
      oName,
      address,
      suburb,
      postcode,
      state,
      email,
      phone,
      projectId,
      updatedBy,
    } = req.body;

    const affected = await updateOwnerInfo(Number(id), {
      oName,
      address,
      suburb,
      postcode,
      state,
      email,
      phone,
      projectId,
      updatedBy,
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
    const affected = await deleteOwnerInfo(Number(id));

    if (!affected) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
}

// ─── PM_PROJECT lookup controller ────────────────────────────────────────────

export async function getProjects(req, res, next) {
  try {
    const data = await getAllProjects();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}