// seedTicketingModule.js
// Adds the "Ticketing" RBAC module + permissions (VIEW_ALL / VIEW_SELF / CREATE / EDIT / DELETE).
// Idempotent — safe to re-run.
import "dotenv/config";

import { initDb, getConnection } from "./src/config/db.js";
import oracledb from "oracledb";

const actions = [
  { code: "VIEW_ALL",  name: "View All" },
  { code: "VIEW_SELF", name: "View Self" },
  { code: "CREATE",    name: "Create" },
  { code: "EDIT",      name: "Edit" },
  { code: "DELETE",    name: "Delete" },
];

const moduleName = "Ticketing";
const moduleDesc = "Project change requests / variations / special notes";
const moduleSeq = 18;

const toModulePrefix = (name) =>
  name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export const seedTicketingModule = async () => {
  let conn;
  try {
    conn = await getConnection();

    const existing = await conn.execute(
      `SELECT ID FROM PM.MODULES WHERE MODULE_NAME = :1`, [moduleName]
    );
    let modId = existing.rows[0]?.[0];

    if (!modId) {
      const result = await conn.execute(
        `INSERT INTO PM.MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
         VALUES (:m_name, :m_desc, :m_seq)
         RETURNING ID INTO :returned_id`,
        {
          m_name: moduleName,
          m_desc: moduleDesc,
          m_seq: moduleSeq,
          returned_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        }
      );
      modId = result.outBinds.returned_id[0];
      console.log(`✓ Module '${moduleName}' → ID ${modId}`);
    } else {
      console.log(`- Module '${moduleName}' already exists → ID ${modId}.`);
    }

    const prefix = toModulePrefix(moduleName);
    let total = 0;
    for (const action of actions) {
      const code = `${prefix}_${action.code}`;
      const existingPerm = await conn.execute(
        `SELECT ID FROM PM.PERMISSIONS WHERE PERMISSION_CODE = :1`, [code]
      );
      if (existingPerm.rows.length > 0) {
        console.log(`  - Permission '${code}' already exists. Skipping.`);
        continue;
      }
      await conn.execute(
        `INSERT INTO PM.PERMISSIONS (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME, DESCRIPTION)
         VALUES (:mod_id, :p_code, :p_name, :p_desc)`,
        {
          mod_id: modId,
          p_code: code,
          p_name: `${moduleName} ${action.name}`,
          p_desc: `${action.name} access for ${moduleName}.`,
        }
      );
      console.log(`  ✓ [${moduleName}] ${code}`);
      total++;
    }

    await conn.commit();
    console.log(`✅ Ticketing Module Seed Complete: ${total} permissions inserted.`);
    console.log("  Next step: assign TICKET_VIEW_ALL / TICKET_VIEW_SELF to roles (ROLE_PERMISSIONS).");
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Ticketing Module Seed Failure:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
    await initDb();
    console.log("🚀 Starting Ticketing module seed...");
    await seedTicketingModule();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();