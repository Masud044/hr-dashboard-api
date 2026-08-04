// seedRolePermissions.js
// Maps ALL permissions to Admin role only (PM schema).
// DataEntry / Worker / Owner permission mapping will be done manually later.
// Run AFTER: seedRole.js → seedRBAC.js → seedDashboardModules.js → this file

import "dotenv/config";

import { getConnection, initDb } from "./src/config/db.js";

export const seedRolePermissions = async () => {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. Fetch Admin role ID ─────────────────────────────────────────────
    const roleRes = await conn.execute(
      `SELECT ID FROM PM.ROLES WHERE ROLE_NAME = :1`, ["Admin"]
    );
    if (roleRes.rows.length === 0)
      throw new Error("Role 'Admin' not found. Run seedRole.js first.");

    const adminId = roleRes.rows[0][0];
    console.log(`✅ Role → Admin: ${adminId}`);

    // ── 2. Fetch all permissions ───────────────────────────────────────────
    const allPermsRes = await conn.execute(
      `SELECT ID, PERMISSION_CODE FROM PM.PERMISSIONS`
    );
    const permMap = {};
    for (const [id, code] of allPermsRes.rows) {
      permMap[code] = id;
    }
    console.log(`✅ ${Object.keys(permMap).length} permissions loaded.\n`);

    // ── 3. Insert helper (duplicate-safe) ─────────────────────────────────
    const assign = async (roleId, permCode) => {
      const permId = permMap[permCode];
      if (!permId) {
        console.warn(`  ⚠ Permission '${permCode}' not in DB. Skipping.`);
        return;
      }
      const check = await conn.execute(
        `SELECT 1 FROM PM.ROLE_PERMISSIONS
          WHERE ROLE_ID = :1 AND PERMISSION_ID = :2`,
        [roleId, permId]
      );
      if (check.rows.length === 0) {
        await conn.execute(
          `INSERT INTO PM.ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID, GRANTED_BY)
           VALUES (:1, :2, NULL)`,
          [roleId, permId]
        );
      }
    };

    // ── 4. Assign ALL permissions to Admin ────────────────────────────────
    console.log("👑 Seeding ADMIN (full access to all permissions)...");
    for (const code of Object.keys(permMap)) {
      await assign(adminId, code);
      console.log(`  ✓ ${code}`);
    }

    await conn.commit();

    // ── Summary ───────────────────────────────────────────────────────────
    const countRes = await conn.execute(
      `SELECT r.ROLE_NAME, COUNT(rp.PERMISSION_ID) AS CNT
       FROM PM.ROLES r
       LEFT JOIN PM.ROLE_PERMISSIONS rp ON r.ID = rp.ROLE_ID
       WHERE r.ROLE_NAME = 'Admin'
       GROUP BY r.ROLE_NAME`
    );
    console.log("\n📊 Final Role–Permission Summary:");
    for (const [roleName, cnt] of countRes.rows) {
      console.log(`  ${String(roleName).padEnd(12)}: ${cnt} permissions`);
    }
    console.log("\n✅ Role–Permission Mapping Complete (Admin only)!");

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Mapping failed:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
    await initDb();
    await seedRolePermissions();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();