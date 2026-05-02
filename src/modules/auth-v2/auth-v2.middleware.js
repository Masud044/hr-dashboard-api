import jwt from "jsonwebtoken";
import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";

export const protectRouteV2 = async (req, res, next) => {
  try {
    // 1. Bearer token extract
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access denied. Provide a Bearer token in Authorization header.",
      });
    }
    const token = authHeader.split(" ")[1];

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired. Please login again." });
      }
      return res.status(401).json({ error: "Invalid token." });
    }

    // 3. DB check — withConnection ব্যবহার করো
    const user = await getConnection(async (conn) => {       // ← fix
      const result = await conn.execute(
        `SELECT ID, USERNAME, STATUS, EMPLOYEE_ID
           FROM HCM.USERS WHERE ID = :id`,
        { id: decoded.id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows[0] ?? null;
    });

    if (!user) {
      return res.status(401).json({ error: "User no longer exists." });
    }
    if (user.STATUS !== "ACTIVE") {
      return res.status(403).json({ error: "Account is inactive or suspended." });
    }

    // 4. req.user set করো
    req.user = {
      id:          user.ID,
      username:    user.USERNAME,
      employee_id: user.EMPLOYEE_ID,
      roles:       decoded.roles || [],
    };

    next();
  } catch (error) {
    console.error("❌ protectRouteV2 error:", error);
    return res.status(500).json({ error: "Authentication failed." });
  }
};