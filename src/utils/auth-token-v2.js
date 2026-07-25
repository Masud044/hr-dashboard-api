// src/utils/auth-token-v2.js
// ─────────────────────────────────────────────
// Token-only version — NO cookie is set.
// The client must store the token in localStorage / sessionStorage
// and send it back as:  Authorization: Bearer <token>
// ─────────────────────────────────────────────
import jwt from "jsonwebtoken";

/**
 * @param {number}   userId
 * @param {string}   userName
 * @param {string[]} roles       - e.g. ["ADMIN", "HR_MANAGER"]
 * @param {string}   userType    - "WORKER" | "OWNER" | null
 * @param {number}   refId       - WORKER_ID or PM_OWNER_INFO.ID
 * @returns {string} signed JWT
 */
export const generateTokenV2 = (userId, userName, roles = [], userType, refId) => {
  const payload = {
    id: userId,
    username: userName,
    userType: userType ?? null,
    refId: refId ?? null,
    roles,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  return token;
};