import { executeCreateContractor } from "./service.js";

export async function createContractorFromProcess(req, res) {
  if (!Object.prototype.hasOwnProperty.call(req.body || {}, "process_id")) {
    return res.json({ success: 0, message: "Missing process_id" });
  }
  try {
    await executeCreateContractor(req.body.process_id);
    return res.json({
      success: 1,
      message: `Procedure executed successfully for process_id ${Number(req.body.process_id)}`
    });
    
  } catch (error) {
    return res.json({ success: 0, message: `Exception: ${error.message}` });
  }
}
