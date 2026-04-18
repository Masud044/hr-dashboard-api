import { getConnection } from "../../config/db.js";

export async function executeCreateContractor(processId) {
  const connection = await getConnection();
  try {
    await connection.execute("BEGIN CREATE_CONTRACTOR(:p_id); END;", { p_id: Number(processId) });
    return true;
  } finally {
    await connection.close();
  }
}
