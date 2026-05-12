import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// ─────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────

export const createUser = async (data) => {
  const conn = await getConnection();
  try {
    const passwordHash = await bcrypt.hash(data.PASSWORD, SALT_ROUNDS);
    const result = await conn.execute(
      `INSERT INTO USERS
         (USERNAME, PASSWORD_HASH, STATUS, CREATED_AT)
       VALUES
         (:USERNAME, :PASSWORD_HASH, :STATUS, SYSDATE)
       RETURNING ID INTO :ID`,
      {
        USERNAME:      data.USERNAME,
        PASSWORD_HASH: passwordHash,
        STATUS:        data.STATUS ?? "ACTIVE",
        ID:            { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );
    return { id: result.outBinds.ID[0] };
  } finally {
    await conn.close();
  }
};

export const getAllUsers = async ({
  page         = 1,
  limit        = 20,
  search       = "",
  sortBy       = "CREATED_AT",
  sortOrder    = "DESC",
  roleId       = "",
  moduleId     = "",
  permissionId = "",
} = {}) => {
  const conn = await getConnection();
  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const ALLOWED_SORT  = ["USERNAME", "CREATED_AT"];
    const ALLOWED_ORDER = ["ASC", "DESC"];
    const safeSort  = ALLOWED_SORT.includes(sortBy?.toUpperCase())     ? sortBy.toUpperCase()    : "CREATED_AT";
    const safeOrder = ALLOWED_ORDER.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : "DESC";

    const conditions = [];
    const binds      = {};

    if (search) {
      conditions.push(`UPPER(u.USERNAME) LIKE UPPER(:SEARCH)`);
      binds.SEARCH = `%${search}%`;
    }

    if (roleId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM USER_ROLES ur2
        WHERE ur2.USER_ID = u.ID AND ur2.ROLE_ID = :ROLE_ID
      )`);
      binds.ROLE_ID = parseInt(roleId);
    }

    if (permissionId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM USER_PERMISSIONS up2
        WHERE up2.USER_ID = u.ID AND up2.PERMISSION_ID = :PERMISSION_ID
      )`);
      binds.PERMISSION_ID = parseInt(permissionId);
    }

    if (moduleId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM USER_PERMISSIONS up2
        JOIN PERMISSIONS p2 ON up2.PERMISSION_ID = p2.ID
        WHERE up2.USER_ID = u.ID AND p2.MODULE_ID = :MODULE_ID
      )`);
      binds.MODULE_ID = parseInt(moduleId);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // ── Count query ──────────────────────────────────────────────────────────
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
       FROM USERS u
       ${whereClause}`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const total      = countResult.rows[0].TOTAL;
    const totalPages = Math.ceil(total / parseInt(limit)) || 1;

    // ── Data query ───────────────────────────────────────────────────────────
    const dataResult = await conn.execute(
      `SELECT *
       FROM (
         SELECT
           u.ID, u.USERNAME, u.STATUS, u.CREATED_AT, u.UPDATED_AT,
           ROW_NUMBER() OVER (ORDER BY u.${safeSort} ${safeOrder}) AS RN
         FROM USERS u
         ${whereClause}
       )
       WHERE RN > :OFFSET AND RN <= :OFFSET_END`,
      { ...binds, OFFSET: offset, OFFSET_END: offset + parseInt(limit) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      data:       dataResult.rows,
      pagination: { total, totalPages, page: parseInt(page), limit: parseInt(limit) },
    };
  } finally {
    await conn.close();
  }
};

export const getUserById = async (id) => {
  const conn = await getConnection();
  try {
    const userResult = await conn.execute(
      `SELECT u.ID, u.USERNAME, u.STATUS, u.CREATED_AT, u.UPDATED_AT
       FROM USERS u
       WHERE u.ID = :ID`,
      { ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const user = userResult.rows[0] ?? null;
    if (!user) return null;

    const rolesResult = await conn.execute(
      `SELECT r.ID, r.ROLE_NAME, r.DESCRIPTION, ur.ASSIGNED_AT
       FROM USER_ROLES ur
       JOIN ROLES r ON ur.ROLE_ID = r.ID
       WHERE ur.USER_ID = :USER_ID`,
      { USER_ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const permissionsResult = await conn.execute(
      `SELECT
         p.ID, p.PERMISSION_CODE, p.PERMISSION_NAME, p.DESCRIPTION,
         m.MODULE_NAME, m.ID AS MODULE_ID,
         up.GRANTED_AT
       FROM USER_PERMISSIONS up
       JOIN PERMISSIONS p ON up.PERMISSION_ID = p.ID
       LEFT JOIN MODULES m ON p.MODULE_ID = m.ID
       WHERE up.USER_ID = :USER_ID
       ORDER BY m.SEQUENCE_NO, p.ID`,
      { USER_ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      ...user,
      roles:       rolesResult.rows,
      permissions: permissionsResult.rows,
    };
  } finally {
    await conn.close();
  }
};

export const updateUser = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE USERS
          SET USERNAME   = :USERNAME,
              STATUS     = :STATUS,
              UPDATED_AT = SYSDATE
        WHERE ID = :ID`,
      {
        ID:       parseInt(id),
        USERNAME: data.USERNAME,
        STATUS:   data.STATUS ?? "ACTIVE",
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const changePassword = async (id, newPassword) => {
  const conn = await getConnection();
  try {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const result = await conn.execute(
      `UPDATE USERS
          SET PASSWORD_HASH = :PASSWORD_HASH,
              UPDATED_AT    = SYSDATE
        WHERE ID = :ID`,
      { ID: parseInt(id), PASSWORD_HASH: passwordHash },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const deleteUser = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE USERS
          SET STATUS = 'INACTIVE', UPDATED_AT = SYSDATE
        WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const activateUser = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE USERS
          SET STATUS = 'ACTIVE', UPDATED_AT = SYSDATE
        WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  MODULES
// ─────────────────────────────────────────

export const getAllModules = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM MODULES ORDER BY SEQUENCE_NO, ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const createModule = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
       VALUES (:MODULE_NAME, :DESCRIPTION, :SEQUENCE_NO)`,
      {
        MODULE_NAME: data.MODULE_NAME,
        DESCRIPTION: data.DESCRIPTION ?? null,
        SEQUENCE_NO: data.SEQUENCE_NO ?? null,
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const updateModule = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE MODULES
          SET MODULE_NAME = :MODULE_NAME,
              DESCRIPTION = :DESCRIPTION,
              SEQUENCE_NO = :SEQUENCE_NO
        WHERE ID = :ID`,
      {
        ID:          parseInt(id),
        MODULE_NAME: data.MODULE_NAME,
        DESCRIPTION: data.DESCRIPTION ?? null,
        SEQUENCE_NO: data.SEQUENCE_NO ?? null,
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const deleteModule = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM MODULES WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  ROLES
// ─────────────────────────────────────────

export const getAllRoles = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM ROLES ORDER BY ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const createRole = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO ROLES (ROLE_NAME, DESCRIPTION, CREATED_AT)
       VALUES (:ROLE_NAME, :DESCRIPTION, SYSDATE)`,
      {
        ROLE_NAME:   data.ROLE_NAME,
        DESCRIPTION: data.DESCRIPTION ?? null,
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const updateRole = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE ROLES
          SET ROLE_NAME   = :ROLE_NAME,
              DESCRIPTION = :DESCRIPTION
        WHERE ID = :ID`,
      {
        ID:          parseInt(id),
        ROLE_NAME:   data.ROLE_NAME,
        DESCRIPTION: data.DESCRIPTION ?? null,
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const deleteRole = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM ROLES WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  PERMISSIONS
// ─────────────────────────────────────────

export const getAllPermissions = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         p.ID, p.PERMISSION_CODE, p.PERMISSION_NAME, p.DESCRIPTION,
         p.MODULE_ID, m.MODULE_NAME, m.SEQUENCE_NO
       FROM PERMISSIONS p
       LEFT JOIN MODULES m ON p.MODULE_ID = m.ID
       ORDER BY m.SEQUENCE_NO, p.ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const createPermission = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO PERMISSIONS
         (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME, DESCRIPTION)
       VALUES
         (:MODULE_ID, :PERMISSION_CODE, :PERMISSION_NAME, :DESCRIPTION)`,
      {
        MODULE_ID:       data.MODULE_ID,
        PERMISSION_CODE: data.PERMISSION_CODE,
        PERMISSION_NAME: data.PERMISSION_NAME,
        DESCRIPTION:     data.DESCRIPTION ?? null,
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const deletePermission = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM PERMISSIONS WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  ASSIGN / REVOKE
// ─────────────────────────────────────────

export const assignRoleToUser = async (userId, roleId) => {
  const conn = await getConnection();
  try {
    const existing = await conn.execute(
      `SELECT ID FROM USER_ROLES
        WHERE USER_ID = :USER_ID AND ROLE_ID = :ROLE_ID`,
      { USER_ID: parseInt(userId), ROLE_ID: parseInt(roleId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) throw new Error("Role already assigned to this user");

    await conn.execute(
      `INSERT INTO USER_ROLES (USER_ID, ROLE_ID, ASSIGNED_AT)
       VALUES (:USER_ID, :ROLE_ID, SYSDATE)`,
      { USER_ID: parseInt(userId), ROLE_ID: parseInt(roleId) },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const revokeRoleFromUser = async (userId, roleId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM USER_ROLES
        WHERE USER_ID = :USER_ID AND ROLE_ID = :ROLE_ID`,
      { USER_ID: parseInt(userId), ROLE_ID: parseInt(roleId) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const assignPermissionToUser = async (userId, permissionId) => {
  const conn = await getConnection();
  try {
    const existing = await conn.execute(
      `SELECT ID FROM USER_PERMISSIONS
        WHERE USER_ID = :USER_ID AND PERMISSION_ID = :PERMISSION_ID`,
      { USER_ID: parseInt(userId), PERMISSION_ID: parseInt(permissionId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) throw new Error("Permission already assigned to this user");

    await conn.execute(
      `INSERT INTO USER_PERMISSIONS (USER_ID, PERMISSION_ID, GRANTED_AT)
       VALUES (:USER_ID, :PERMISSION_ID, SYSDATE)`,
      { USER_ID: parseInt(userId), PERMISSION_ID: parseInt(permissionId) },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const revokePermissionFromUser = async (userId, permissionId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM USER_PERMISSIONS
        WHERE USER_ID = :USER_ID AND PERMISSION_ID = :PERMISSION_ID`,
      { USER_ID: parseInt(userId), PERMISSION_ID: parseInt(permissionId) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  ROLE_PERMISSIONS
// ─────────────────────────────────────────

export const getRolePermissions = async (roleId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT p.ID, p.PERMISSION_CODE, p.PERMISSION_NAME, p.DESCRIPTION,
              m.MODULE_NAME, m.ID AS MODULE_ID, rp.GRANTED_AT
       FROM ROLE_PERMISSIONS rp
       JOIN PERMISSIONS p ON rp.PERMISSION_ID = p.ID
       LEFT JOIN MODULES m ON p.MODULE_ID = m.ID
       WHERE rp.ROLE_ID = :ROLE_ID
       ORDER BY m.SEQUENCE_NO, p.ID`,
      { ROLE_ID: parseInt(roleId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const assignPermissionToRole = async (roleId, permissionId, grantedBy = null) => {
  const conn = await getConnection();
  try {
    const existing = await conn.execute(
      `SELECT ID FROM ROLE_PERMISSIONS
        WHERE ROLE_ID = :ROLE_ID AND PERMISSION_ID = :PERMISSION_ID`,
      { ROLE_ID: parseInt(roleId), PERMISSION_ID: parseInt(permissionId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) throw new Error("Permission already assigned to this role");

    await conn.execute(
      `INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID, GRANTED_BY, GRANTED_AT)
       VALUES (:ROLE_ID, :PERMISSION_ID, :GRANTED_BY, SYSDATE)`,
      {
        ROLE_ID:       parseInt(roleId),
        PERMISSION_ID: parseInt(permissionId),
        GRANTED_BY:    grantedBy ? parseInt(grantedBy) : null,
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const revokePermissionFromRole = async (roleId, permissionId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM ROLE_PERMISSIONS
        WHERE ROLE_ID = :ROLE_ID AND PERMISSION_ID = :PERMISSION_ID`,
      { ROLE_ID: parseInt(roleId), PERMISSION_ID: parseInt(permissionId) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  EFFECTIVE PERMISSIONS  ← used by middleware
// ─────────────────────────────────────────

export const getUserEffectivePermissions = async (userId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT DISTINCT p.ID, p.PERMISSION_CODE, p.PERMISSION_NAME
       FROM PERMISSIONS p
       WHERE p.ID IN (
         SELECT up.PERMISSION_ID
         FROM USER_PERMISSIONS up
         WHERE up.USER_ID = :USER_ID

         UNION

         SELECT rp.PERMISSION_ID
         FROM ROLE_PERMISSIONS rp
         JOIN USER_ROLES ur ON rp.ROLE_ID = ur.ROLE_ID
         WHERE ur.USER_ID = :USER_ID
       )
       ORDER BY p.ID`,
      { USER_ID: parseInt(userId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};