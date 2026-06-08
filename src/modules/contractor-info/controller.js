import {
  createContractorWithTypes,
  getContractors,
  getContractorDetail,
  updateContractorWithTypes,
  deleteContractorWithTypes,
} from "./service.js";

// ─────────────────────────────────────────────
//  POST /api/contractors
//  Body: { contractor: {...}, contractorTypes: [1, 2, 3] }
// ─────────────────────────────────────────────
export async function createContractor(req, res) {
  try {
    const { contractor, contractorTypes } = req.body;

    // Basic validation
    if (!contractor?.CONTRATOR_NAME) {
      return res.status(400).json({
        success: false,
        message: "CONTRATOR_NAME is required.",
      });
    }

    if (!Array.isArray(contractorTypes) || contractorTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one contractorType is required.",
      });
    }

    const result = await createContractorWithTypes({ contractor, contractorTypes });

    return res.status(201).json({
      success: true,
      message: "Contractor created successfully.",
      data: result,
    });
  } catch (err) {
    console.error("[createContractor] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create contractor.",
      error: err.message,
    });
  }
}

// ─────────────────────────────────────────────
//  GET /api/contractors
//  GET /api/contractors/:id
// ─────────────────────────────────────────────
export async function getAllContractors(req, res) {
  try {
    const rows = await getContractors(0);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("[getAllContractors] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contractors.",
      error: err.message,
    });
  }
}

export async function getContractorById(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid contractor ID." });
    }

    const data = await getContractorDetail(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Contractor not found." });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[getContractorById] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contractor.",
      error: err.message,
    });
  }
}

// ─────────────────────────────────────────────
//  PUT /api/contractors/:id
//  Body: { contractor: {...}, contractorTypes: [1, 2, 3] }
// ─────────────────────────────────────────────
export async function updateContractor(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid contractor ID." });
    }

    const { contractor, contractorTypes } = req.body;

    if (!contractor) {
      return res.status(400).json({ success: false, message: "Contractor data is required." });
    }

    if (!Array.isArray(contractorTypes) || contractorTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one contractorType is required.",
      });
    }

    const result = await updateContractorWithTypes(id, { contractor, contractorTypes });

    return res.status(200).json({
      success: true,
      message: "Contractor updated successfully.",
      data: result,
    });
  } catch (err) {
    console.error("[updateContractor] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update contractor.",
      error: err.message,
    });
  }
}

// ─────────────────────────────────────────────
//  DELETE /api/contractors/:id
// ─────────────────────────────────────────────
export async function deleteContractor(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid contractor ID." });
    }

    const rowsAffected = await deleteContractorWithTypes(id);

    if (!rowsAffected) {
      return res.status(404).json({ success: false, message: "Contractor not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Contractor deleted successfully.",
    });
  } catch (err) {
    console.error("[deleteContractor] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete contractor.",
      error: err.message,
    });
  }
}