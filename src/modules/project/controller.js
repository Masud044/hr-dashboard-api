import { insertProject, searchProject, updateProject, deleteProject } from "./service.js";

export async function handleProject(req, res) {
  if (req.method === "POST") {
    if (!req.body?.P_NAME || !req.body?.USER_ID) {
      return res.status(400).json({ success: false, message: "P_NAME and USER_ID are required." });
    }
    const P_ID = await insertProject(req.body);
    return res.status(201).json({ success: true, message: "Project created.", P_ID });
  }

  if (req.method === "GET") {
    const p_id = Number(req.query.p_id || 0);
    const data = await searchProject(p_id);
    if (p_id > 0 && !data.length) {
      return res.status(404).json({ success: false, message: `Project with ID ${p_id} not found.` });
    }
    return res.json({ success: true, count: data.length, data });
  }

  if (req.method === "PUT") {
    if (!req.body?.P_ID || !req.body?.UPDATED_BY) {
      return res.status(400).json({ success: false, message: "P_ID and UPDATED_BY are required for update." });
    }
    const rows = await updateProject(req.body);
    if (!rows) {
      return res.status(404).json({ success: false, message: `Project with ID ${req.body.P_ID} not found or no changes made.` });
    }
    return res.json({ success: true, message: `Project ${req.body.P_ID} updated successfully.` });
  }

  if (req.method === "DELETE") {
    if (!req.body?.P_ID) return res.status(400).json({ success: false, message: "P_ID is required for deletion." });
    const rows = await deleteProject(req.body.P_ID);
    if (!rows) return res.status(404).json({ success: false, message: `Project with ID ${req.body.P_ID} not found.` });
    return res.json({ success: true, message: `Project ${req.body.P_ID} deleted successfully.` });
  }

  return res.status(405).json({ success: false, message: "Method not supported." });
}
