// seedRBAC.js
// Modules & Permissions based on app.js routes
// Run AFTER seedRole.js
import "dotenv/config";

import { initDb, getConnection } from "./src/config/db.js";
import oracledb from "oracledb";

export const seedRbacData = async () => {
  let conn;
  try {
    conn = await getConnection();

    // ─────────────────────────────────────────────────────────────────────────
    // MODULES (7) — based on app.js feature groups
    // ─────────────────────────────────────────────────────────────────────────
    const modulesData = [
      { name: "Contractor",    desc: "Contractor types and contractor info management",          seq: 1 },
      { name: "Project",       desc: "Projects, project types, and construction processes",      seq: 2 },
      { name: "Dashboard timeline",         desc: "Gantt chart, schedule, schedule header and schedule API",  seq: 3 },
      { name: "User Management",     desc: "User accounts, roles, and auth management",                seq: 4},
    ];

    const moduleMap = {};

    console.log("📦 Inserting Modules...");
    for (const m of modulesData) {
      const existing = await conn.execute(
        `SELECT ID FROM HCM.MODULES WHERE MODULE_NAME = :1`, [m.name]
      );
      if (existing.rows.length > 0) {
        moduleMap[m.name] = existing.rows[0][0];
        console.log(`  - Module '${m.name}' already exists → ID ${moduleMap[m.name]}. Skipping.`);
        continue;
      }
      const result = await conn.execute(
        `INSERT INTO HCM.MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
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

    // ─────────────────────────────────────────────────────────────────────────
    // PERMISSIONS — based on app.js routes
    // ─────────────────────────────────────────────────────────────────────────
    const permissionsData = [

      // ── 1. Contractor (8) ─────────────────────────────────────────────────
      { mName: "Contractor", code: "CONTRACTOR_TYPE_VIEW",    name: "View Contractor Types",    desc: "View all contractor type records." },
      { mName: "Contractor", code: "CONTRACTOR_TYPE_MANAGE",  name: "Manage Contractor Types",  desc: "Create, update and delete contractor types." },
      { mName: "Contractor", code: "CONTRACTOR_INFO_VIEW",    name: "View Contractors",         desc: "View all contractor info and details." },
      { mName: "Contractor", code: "CONTRACTOR_INFO_CREATE",  name: "Create Contractor",        desc: "Add new contractor records." },
      { mName: "Contractor", code: "CONTRACTOR_INFO_UPDATE",  name: "Update Contractor",        desc: "Edit existing contractor records." },
      { mName: "Contractor", code: "CONTRACTOR_INFO_DELETE",  name: "Delete Contractor",        desc: "Remove contractor records." },
      { mName: "Contractor", code: "PROCESS_CONTRACTOR_VIEW",   name: "View Process Contractors",   desc: "View process-contractor assignments." },
      { mName: "Contractor", code: "PROCESS_CONTRACTOR_MANAGE", name: "Manage Process Contractors", desc: "Assign and manage process-contractor relationships." },

      // ── 2. Project (8) ────────────────────────────────────────────────────
      { mName: "Project", code: "PROJECT_TYPE_VIEW",    name: "View Project Types",         desc: "View all project type records." },
      { mName: "Project", code: "PROJECT_TYPE_MANAGE",  name: "Manage Project Types",       desc: "Create, update and delete project types." },
      { mName: "Project", code: "PROJECT_VIEW",         name: "View Projects",              desc: "View all project records." },
      { mName: "Project", code: "PROJECT_CREATE",       name: "Create Project",             desc: "Add new projects." },
      { mName: "Project", code: "PROJECT_UPDATE",       name: "Update Project",             desc: "Edit existing project records." },
      { mName: "Project", code: "PROJECT_DELETE",       name: "Delete Project",             desc: "Remove project records." },
      { mName: "Project", code: "CONSTRUCTION_PROCESS_VIEW",   name: "View Construction Processes",   desc: "View construction process definitions." },
      { mName: "Project", code: "CONSTRUCTION_PROCESS_MANAGE", name: "Manage Construction Processes", desc: "Create and manage construction processes." },

      // ── 3. Gantt (10) ─────────────────────────────────────────────────────
      { mName: "Dashboard timeline", code: "GANTT_VIEW",            name: "View Gantt Chart",        desc: "View project gantt charts." },
      { mName: "Dashboard timeline", code: "GANTT_MANAGE",          name: "Manage Gantt",            desc: "Create and update gantt entries." },
      { mName: "Dashboard timeline", code: "CALENDAR_VIEW",         name: "View Calendar",           desc: "View project calendar." },
      { mName: "Dashboard timeline", code: "CALENDAR_MANAGE",       name: "Manage Calendar",         desc: "Create and manage calendar events." },
      { mName: "Dashboard timeline", code: "SCHEDULE_VIEW",         name: "View Schedule",           desc: "View project schedules." },
      { mName: "Dashboard timeline", code: "SCHEDULE_MANAGE",       name: "Manage Schedule",         desc: "Create and update schedule entries." },
      { mName: "Dashboard timeline", code: "SCHEDULE_API_VIEW",     name: "View Schedule API Data",  desc: "Access schedule API endpoints." },
      { mName: "Dashboard timeline", code: "SCHEDULE_API_MANAGE",   name: "Manage Schedule API",     desc: "Write to schedule API endpoints." },
      { mName: "Dashboard timeline", code: "SCHEDULE_HEADER_VIEW",  name: "View Schedule Headers",   desc: "View schedule header definitions." },
      { mName: "Dashboard timeline", code: "SCHEDULE_HEADER_MANAGE",name: "Manage Schedule Headers", desc: "Create and manage schedule headers." },

      

      // ── 7. User Mgmt (6) ──────────────────────────────────────────────────
      { mName: "User Management", code: "USER_VIEW",    name: "View Users",       desc: "View all system user accounts." },
      { mName: "User Management", code: "USER_CREATE",  name: "Create User",      desc: "Create new user accounts." },
      { mName: "User Management", code: "USER_UPDATE",  name: "Update User",      desc: "Edit existing user accounts." },
      { mName: "User Management", code: "USER_DELETE",  name: "Delete User",      desc: "Remove user accounts." },
      { mName: "User Management", code: "AUTH_LOGIN",   name: "Login",            desc: "Authenticate via auth-v2 login." },
      { mName: "User Management", code: "AUTH_MANAGE",  name: "Manage Auth",      desc: "Manage auth tokens and sessions." },
    ];

    console.log("\n🔑 Inserting Permissions...");
    for (const p of permissionsData) {
      const modId = moduleMap[p.mName];
      if (!modId) {
        console.warn(`  ⚠ Module '${p.mName}' not found for '${p.code}'. Skipping.`);
        continue;
      }
      const existing = await conn.execute(
        `SELECT ID FROM HCM.PERMISSIONS WHERE PERMISSION_CODE = :1`, [p.code]
      );
      if (existing.rows.length > 0) {
        console.log(`  - Permission '${p.code}' already exists. Skipping.`);
        continue;
      }
      await conn.execute(
        `INSERT INTO HCM.PERMISSIONS (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME, DESCRIPTION)
         VALUES (:mod_id, :p_code, :p_name, :p_desc)`,
        { mod_id: modId, p_code: p.code, p_name: p.name, p_desc: p.desc }
      );
      console.log(`  ✓ [${p.mName}] ${p.code}`);
    }

    await conn.commit();

    const total = permissionsData.length;
    console.log(`\n✅ RBAC Seed Complete: ${modulesData.length} Modules, ${total} Permissions.`);
    console.log("  Contractor:8 | Project:8 | Gantt:10  | User Mgmt:6");
    console.log("  ─────────────────────────────────────────────────────────────────────────────────────────");
    console.log(`  Total: ${total} ✓`);

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
     await initDb(); // ✅
    console.log("🚀 Starting RBAC seed...");
    await seedRbacData();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();