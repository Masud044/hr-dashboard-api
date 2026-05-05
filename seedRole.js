// seedRole.js
// Roles: Admin only
// Run this FIRST before seedRBAC.js and seedRolePermissions.js
import "dotenv/config";

import { getConnection, initDb } from "./src/config/db.js";

export const seedRoles = async () => {
  let conn;
  try {
    conn = await getConnection();

    const rolesData = [
      {
        name: "Admin",
        desc: "Full system access — Contractors, Projects, Gantt, Schedule,  Customers and User Management.",
      },
    ];

    console.log("🚀 Processing System Roles...");

    for (const r of rolesData) {
      const checkRes = await conn.execute(
        `SELECT ID FROM HCM.ROLES WHERE ROLE_NAME = :1`,
        [r.name]
      );

      if (checkRes.rows.length === 0) {
        await conn.execute(
          `INSERT INTO HCM.ROLES (ROLE_NAME, DESCRIPTION) VALUES (:1, :2)`,
          [r.name, r.desc]
        );
        console.log(`  + Role '${r.name}' inserted successfully.`);
      } else {
        console.log(`  - Role '${r.name}' already exists. Skipping.`);
      }
    }

    await conn.commit();
    console.log("✅ Roles seeding completed.");
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Critical Role Seed Failure:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
     await initDb();
    await seedRoles();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();