// src/modules/auth-v2/auth-v2.controller.js
import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";
import bcrypt from "bcryptjs";
import { generateTokenV2 } from "../../utils/auth-token-v2.js";

// ─────────────────────────────────────────────
// REGISTER — leaving as-is for now (uses old EMPLOYEE_ID flow).
// You said user-management module handles create now — skip unless you want this fixed too.
// ─────────────────────────────────────────────
export const registerV2 = async (req, res) => {
  // ...unchanged, not touching this per current focus...
};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export const loginV2 = async (req, res) => {
  let connection;
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Enter username and password" });
    }

    connection = await getConnection();

    // 1. Find user
    const result = await connection.execute(
      `SELECT ID, USERNAME, PASSWORD_HASH, STATUS, USER_TYPE, REF_ID
       FROM USERS
       WHERE UPPER(USERNAME) = UPPER(:username)`,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Wrong username or password" });
    }

    const user = result.rows[0];

    // 2. Account active?
    if (user.STATUS !== "ACTIVE") {
      return res.status(403).json({ error: "Account inactive or suspended" });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Wrong username or password" });
    }

    // 4. Fetch roles
    const rolesResult = await connection.execute(
      `SELECT R.ROLE_NAME
       FROM ROLES R
       JOIN USER_ROLES UR ON R.ID = UR.ROLE_ID
       WHERE UR.USER_ID = :user_id`,
      { user_id: user.ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const roles = rolesResult.rows.map((r) => r.ROLE_NAME);

    // 5. Fetch effective permissions (direct + via roles)
    const permissionsResult = await connection.execute(
      `SELECT DISTINCT p.PERMISSION_CODE
       FROM PERMISSIONS p
       WHERE p.ID IN (
         SELECT up.PERMISSION_ID FROM USER_PERMISSIONS up WHERE up.USER_ID = :user_id
         UNION
         SELECT rp.PERMISSION_ID
         FROM ROLE_PERMISSIONS rp
         JOIN USER_ROLES ur ON rp.ROLE_ID = ur.ROLE_ID
         WHERE ur.USER_ID = :user_id
       )
       ORDER BY p.PERMISSION_CODE`,
      { user_id: user.ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const permissions = permissionsResult.rows.map((r) => r.PERMISSION_CODE);

    // 6. Resolve refName based on USER_TYPE
    let refName = null;
    if (user.USER_TYPE === "WORKER" && user.REF_ID) {
      const w = await connection.execute(
        `SELECT WORKER_NAME FROM PM.PM_WORKER WHERE WORKER_ID = :id`,
        { id: user.REF_ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      refName = w.rows[0]?.WORKER_NAME ?? null;
    } else if (user.USER_TYPE === "OWNER" && user.REF_ID) {
      const o = await connection.execute(
        `SELECT O_NAME FROM PM_OWNER_INFO WHERE ID = :id`,
        { id: user.REF_ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      refName = o.rows[0]?.O_NAME ?? null;
    }

    // 7. Generate token (no cookie)
    const token = generateTokenV2(user.ID, user.USERNAME, roles, user.USER_TYPE, user.REF_ID);

    return res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user.ID,
          username: user.USERNAME,
          userType: user.USER_TYPE,
          refId: user.REF_ID,
          refName,
          roles,
          permissions,
        },
        token,
      },
    });
  } catch (error) {
    console.error("❌ LoginV2 error:", error);
    return res.status(500).json({ error: "Login failed" });
  } finally {
    if (connection) await connection.close().catch(console.error);
  }
};

// ─────────────────────────────────────────────
// LOGOUT — unchanged
// ─────────────────────────────────────────────
export const logoutV2 = (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "Logout successful. Please remove the token from storage.",
  });
};