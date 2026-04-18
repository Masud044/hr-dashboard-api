import {
  saveMasterDetail,
  searchMasterDetail,
  searchMasterDetailOnly,
  deleteMasterDetail
} from "./service.js";

export async function getSchedule(req, res) {
  try {
    const hId = Number(req.query.h_id || 0);
    if (hId > 0) {
      const result = await searchMasterDetailOnly(req.query || {});
      if (result.notFound) {
        return res.status(404).json({
          success: false,
          message: `Schedule H_ID ${result.hId} not found.`
        });
      }
      return res.status(200).json({ success: true, data: result.data });
    }

    const headers = await searchMasterDetail(req.query || {});
    return res.status(200).json({ success: true, count: headers.length, data: headers });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: `API Error: ${error.message}`
    });
  }
}

export async function postSchedule(req, res) {
  try {
    const result = await saveMasterDetail(req.body || {});
    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      H_ID: result.H_ID,
      New_Line_IDs: result.New_Line_IDs
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: `API Error: ${error.message}`
    });
  }
}

export async function putSchedule(req, res) {
  try {
    const result = await saveMasterDetail(req.body || {});
    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      H_ID: result.H_ID,
      New_Line_IDs: result.New_Line_IDs
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: `API Error: ${error.message}`
    });
  }
}

export async function deleteSchedule(req, res) {
  try {
    const result = await deleteMasterDetail(req.body || {});
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: `Schedule H_ID ${result.hId} not found.`
      });
    }
    return res.status(200).json({
      success: true,
      message: `Schedule H_ID ${result.hId} deleted (Header: 1, Lines: ${result.linesDeleted}).`
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: `API Error: ${error.message}`
    });
  }
}
