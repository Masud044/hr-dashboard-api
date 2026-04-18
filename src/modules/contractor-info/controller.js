import { insertContractor, searchContractor, updateContractor, deleteContractor } from "./service.js";

export async function handleContractorInfo(req, res) {
  if (req.method === "POST") {
    if (!req.body?.CONTRATOR_NAME || !req.body?.ENTRY_BY) {
      return res.status(400).json({ success: false, message: "CONTRATOR_NAME and ENTRY_BY are required." });
    }
    const CONTRATOR_ID = await insertContractor({ ...req.body, UPDATE_BY: req.body.UPDATE_BY ?? req.body.ENTRY_BY, STATUS: req.body.STATUS ?? 1 });
    return res.status(201).json({ success: true, message: "Contractor created.", CONTRATOR_ID });
  }
  if (req.method === "GET") {
    const c_id = Number(req.query.contrator_id || 0);
    const data = await searchContractor(c_id);
    if (c_id > 0 && !data.length) return res.status(404).json({ success: false, message: `Contractor ID ${c_id} not found.` });
    return res.json({ success: true, count: data.length, data });
  }
  if (req.method === "PUT") {
    if (!req.body?.CONTRATOR_ID) return res.status(400).json({ success: false, message: "CONTRATOR_ID and UPDATE_BY are required for update." });
    const rows = await updateContractor(req.body);
    if (!rows) return res.status(404).json({ success: false, message: `Contractor ID ${req.body.CONTRATOR_ID} not found or no changes made.` });
    return res.json({ success: true, message: `Contractor ID ${req.body.CONTRATOR_ID} updated successfully.` });
  }
  if (req.method === "DELETE") {
    if (!req.body?.CONTRATOR_ID) return res.status(400).json({ success: false, message: "CONTRATOR_ID is required for deletion." });
    const rows = await deleteContractor(req.body.CONTRATOR_ID);
    if (!rows) return res.status(404).json({ success: false, message: `Contractor ID ${req.body.CONTRATOR_ID} not found.` });
    return res.json({ success: true, message: `Contractor ID ${req.body.CONTRATOR_ID} deleted successfully.` });
  }
  return res.status(405).json({ success: false, message: "Method not supported." });
}
