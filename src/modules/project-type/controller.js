import {
  listProjectTypes,
  createProjectType,
  updateProjectType,
  deleteProjectType
} from "./service.js";

export async function handleProjectType(req, res) {
  if (req.method === "GET") {
    const data = await listProjectTypes();
    return res.json({ success: true, data });
  }

  if (req.method === "POST") {
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, "NAME")) {
      return res.json({ success: false, error: "NAME required" });
    }
    const result = await createProjectType(req.body);
    return res.json(result);
  }

  if (req.method === "PUT") {
    if (
      !Object.prototype.hasOwnProperty.call(req.body || {}, "ID") ||
      !Object.prototype.hasOwnProperty.call(req.body || {}, "NAME")
    ) {
      return res.json({ success: false, error: "ID and NAME required" });
    }
    const result = await updateProjectType(req.body);
    return res.json(result);
  }

  if (req.method === "DELETE") {
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, "ID")) {
      return res.json({ success: false, error: "ID required" });
    }
    const result = await deleteProjectType(req.body);
    return res.json(result);
  }

  return res.json({ success: false, error: "Unsupported method" });
}
