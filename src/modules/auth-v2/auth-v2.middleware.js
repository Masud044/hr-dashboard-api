import jwt from "jsonwebtoken";
import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";
import { getUserEffectivePermissions } from "../user-management/user-management.service.js";

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