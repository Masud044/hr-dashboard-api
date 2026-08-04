// src\modules\auth-v2\auth-v2.middleware.js
import jwt from "jsonwebtoken";
import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";
import { getUserEffectivePermissions } from "../user-management/user-management.service.js";

// ─────────────────────────────────────────────
// protectRouteV2
// ─────────────────────────────────────────────
export const protectRouteV2 = async (req, res, next) => {
  let connection;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access denied. Provide a Bearer token in Authorization header.",
      });
    }
    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired. Please login again." });
      }
      return res.status(401).json({ error: "Invalid token." });
    }

    connection = await getConnection();

    const result = await connection.execute(
      `SELECT ID, USERNAME, STATUS, USER_TYPE, REF_ID
         FROM USERS WHERE ID = :id`,
      { id: decoded.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const user = result.rows[0] ?? null;

    if (!user) {
      return res.status(401).json({ error: "User no longer exists." });
    }
    if (user.STATUS !== "ACTIVE") {
      return res.status(403).json({ error: "Account is inactive or suspended." });
    }

    // Fresh permissions from DB (never stale) — reuses same logic as user-management module
    const permRows = await getUserEffectivePermissions(user.ID);
    const permissions = permRows.map((p) => p.PERMISSION_CODE);

    req.user = {
      id: user.ID,
      username: user.USERNAME,
      userType: user.USER_TYPE,
      refId: user.REF_ID,
      roles: decoded.roles || [],
      permissions,
    };

    next();
  } catch (error) {
    console.error("❌ protectRouteV2 error:", error);
    return res.status(500).json({ error: "Authentication failed." });
  } finally {
    if (connection) await connection.close().catch(console.error);
  }
};

// ─────────────────────────────────────────────
// authorizeRolesV2  (coarse role check)
// ─────────────────────────────────────────────
export const authorizeRolesV2 = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasRole = userRoles.some((role) =>
      allowedRoles.map((r) => r.toUpperCase()).includes(role.toUpperCase())
    );
    if (!hasRole) {
      return res.status(403).json({
        error: `Access denied. Required roles: [${allowedRoles.join(", ")}]. Your roles: [${userRoles.join(", ")}]`,
      });
    }
    next();
  };
};

// ─────────────────────────────────────────────
// authorizePermissionsV2  (fine-grained — module/action based)
//
// Usage (require ALL listed permissions):
//   router.post("/", protectRouteV2, authorizePermissionsV2("PROJECT_CREATE"), ctrl.create)
//
// Usage (require ANY one of the listed permissions):
//   router.get("/", protectRouteV2, authorizePermissionsV2("PROJECT_VIEW", "PROJECT_EDIT", { mode: "ANY" }), ctrl.getAll)
//
// Default mode is "ALL".
// ─────────────────────────────────────────────
export const authorizePermissionsV2 = (...requiredPerms) => {
  let mode = "ALL";
  let perms = requiredPerms;

  if (
    requiredPerms.length > 0 &&
    typeof requiredPerms[requiredPerms.length - 1] === "object"
  ) {
    const opts = requiredPerms[requiredPerms.length - 1];
    mode = opts.mode?.toUpperCase() === "ANY" ? "ANY" : "ALL";
    perms = requiredPerms.slice(0, -1);
  }

  return (req, res, next) => {
    const userPerms = req.user?.permissions || [];

    const granted =
      mode === "ANY"
        ? perms.some((p) => userPerms.includes(p))
        : perms.every((p) => userPerms.includes(p));

    if (!granted) {
      return res.status(403).json({
        error: `Access denied. Required permissions (${mode}): [${perms.join(", ")}]`,
      });
    }

    next();
  };
};