// seedDashboardModules.js
// One-off addition to seedRBAC.js — adds the two "Main Entry" modules that
// were missed in the first pass (Overview / Schedule Dashboard from nav-items.js).
// Idempotent — safe to re-run.
import "dotenv/config";

import { initDb, getConnection } from "./src/config/db.js";
import oracledb from "oracledb";

const DEFAULT_ACTIONS = [
  { code: "VIEW",     name: "View" },
  { code: "CREATE",   name: "Create" },
  { code: "EDIT",     name: "Edit" },
  { code: "DELETE",   name: "Delete" },
  { code: "DOWNLOAD", name: "Download" },
];

const modulesData = [
  {
    name: "Dashboard",
    desc: "Main dashboard overview",
    seq: 16,
    actions: [
      { code: "VIEW_ALL",  name: "View All" },
      { code: "VIEW_SELF", name: "View Self" },
    ],
  },
  {
    name: "Schedule Dashboard",
    desc: "Schedule dashboard overview",
    seq: 17,
    // no override → falls through to DEFAULT_ACTIONS
  },
];

// "Schedule Dashboard" -> "SCHEDULE_DASHBOARD"  (must match toModulePrefix() on the frontend)
const toModulePrefix = (moduleName) =>
  moduleName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export const seedDashboardModules = async () => {
  let conn;
  try {
    conn = await getConnection();

    const moduleMap = {};
    console.log("📦 Inserting Dashboard Modules...");
    for (const m of modulesData) {
      const existing = await conn.execute(
        `SELECT ID FROM PM.MODULES WHERE MODULE_NAME = :1`, [m.name]
      );
      if (existing.rows.length > 0) {
        moduleMap[m.name] = existing.rows[0][0];
        console.log(`  - Module '${m.name}' already exists → ID ${moduleMap[m.name]}. Skipping.`);
        continue;
      }
      const result = await conn.execute(
        `INSERT INTO PM.MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
         VALUES (:m_name, :m_desc, :m_seq)
         RETURNING ID INTO :returned_id`,
        {
          m_name:      m.name,
          m_desc:      m.desc,
          m_seq:       m.seq,
          returned_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        }
      );
      moduleMap[m.name] = result.outBinds.returned_id[0];
      console.log(`  ✓ Module '${m.name}' → ID ${moduleMap[m.name]}`);
    }

    console.log("\n🔑 Inserting Permissions...");
    let total = 0;
    for (const m of modulesData) {
      const modId = moduleMap[m.name];
      const prefix = toModulePrefix(m.name);

      for (const action of (m.actions ?? DEFAULT_ACTIONS)) {
        const code = `${prefix}_${action.code}`;
        const name = `${m.name} ${action.name}`;

        const existing = await conn.execute(
          `SELECT ID FROM PM.PERMISSIONS WHERE PERMISSION_CODE = :1`, [code]
        );
        if (existing.rows.length > 0) {
          console.log(`  - Permission '${code}' already exists. Skipping.`);
          continue;
        }

        await conn.execute(
          `INSERT INTO PM.PERMISSIONS (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME, DESCRIPTION)
           VALUES (:mod_id, :p_code, :p_name, :p_desc)`,
          { mod_id: modId, p_code: code, p_name: name, p_desc: `${action.name} access for ${m.name}.` }
        );
        console.log(`  ✓ [${m.name}] ${code}`);
        total++;
      }
    }

    await conn.commit();
    console.log(`\n✅ Dashboard Modules Seed Complete: ${modulesData.length} Modules, ${total} Permissions inserted.`);

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Critical Seed Failure:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
    await initDb();
    console.log("🚀 Starting Dashboard Modules seed...");
    await seedDashboardModules();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();