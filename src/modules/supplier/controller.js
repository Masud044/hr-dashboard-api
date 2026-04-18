import {
  createSupplier,
  readSupplier,
  readAllSuppliers,
  updateSupplier,
  deleteSupplier
} from "./service.js";

export async function handleSupplier(req, res) {
  if (req.method === "GET") {
    if (req.query.id) {
      const supplier = await readSupplier(req.query.id);
      if (!supplier) return res.status(404).json({ error: "Supplier not found." });
      return res.json(supplier);
    }
    const suppliers = await readAllSuppliers();
    return res.json(suppliers);
  }

  if (req.method === "POST") {
    if (!req.body) return res.status(400).json({ error: "No data provided for creation." });
    const supplierId = await createSupplier(req.body);
    return res.status(201).json({ message: "Supplier created successfully.", SUPPLIER_ID: supplierId });
  }

  if (req.method === "PUT") {
    if (!req.body || !req.body.SUPPLIER_ID) {
      return res.status(400).json({ error: "No data or SUPPLIER_ID provided for update." });
    }
    const result = await updateSupplier(req.body);
    if (result.noFields) return res.status(400).json({ error: "No updateable fields provided." });
    if (result.rowsAffected > 0) return res.json({ message: "Supplier updated successfully." });
    return res.status(404).json({ error: "Supplier not found or no changes made." });
  }

  if (req.method === "DELETE") {
    if (!req.query.id) return res.status(400).json({ error: "No SUPPLIER_ID provided for deletion." });
    const rows = await deleteSupplier(req.query.id);
    if (rows > 0) return res.json({ message: "Supplier deleted successfully." });
    return res.status(404).json({ error: "Supplier not found." });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
