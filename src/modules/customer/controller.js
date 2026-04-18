import { createCustomer, getCustomers, updateCustomer, deleteCustomer } from "./service.js";

export async function handleCustomer(req, res) {
  if (req.method === "POST") {
    if (!req.body?.CUSTOMER_NAME || !req.body?.ORG_ID || !req.body?.ENTRY_BY) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: CUSTOMER_NAME, ORG_ID, and ENTRY_BY."
      });
    }
    await createCustomer(req.body);
    return res.status(201).json({ success: true, message: "Customer inserted successfully." });
  }
  if (req.method === "GET") {
    const rows = await getCustomers(req.query.customer_id);
    if (req.query.customer_id && !rows.length) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }
    return res.json({ success: true, data: rows });
  }
  if (req.method === "PUT") {
    if (!req.body?.CUSTOMER_ID) {
      return res.status(400).json({ success: false, message: "CUSTOMER_ID is required for update." });
    }
    if (req.body.UPDATE_BY === undefined || req.body.UPDATE_BY === null) {
      return res.status(400).json({ success: false, message: "No fields provided for update or UPDATE_BY is missing." });
    }
    const rows = await updateCustomer(req.body);
    if (!rows) return res.status(404).json({ success: false, message: "Customer ID not found or no data changed." });
    return res.json({ success: true, message: "Customer updated successfully." });
  }
  if (req.method === "DELETE") {
    if (!req.query.customer_id) {
      return res.status(400).json({ success: false, message: "CUSTOMER_ID is required for deletion (in query string)." });
    }
    const rows = await deleteCustomer(req.query.customer_id);
    if (!rows) return res.status(404).json({ success: false, message: "Customer ID not found." });
    return res.json({ success: true, message: "Customer deleted successfully." });
  }
  return res.status(405).json({ success: false, message: "Method not supported." });
}
