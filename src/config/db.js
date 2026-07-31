// src\config\db.js
import oracledb from 'oracledb';

let pool = null;

function initThickMode() {
  const libDir = process.env.ORACLE_CLIENT_LIB_DIR;
  try {
    if (libDir && String(libDir).trim() !== '') {
      oracledb.initOracleClient({ libDir: String(libDir).trim() });
    } else {
      oracledb.initOracleClient();
    }
  } catch (err) {
    const msg = err && err.message ? String(err.message) : '';
    if (msg.includes('already been initialized')) {
      return;
    }
    throw err;
  }
}

/**
 * Creates pool, verifies connectivity with SELECT 1 FROM DUAL.
 * Logs "Database connected successfully" or throws with a clear message.
 */
export async function initDb() {
  if (process.env.ORACLE_THICK_MODE === 'true') {
    initThickMode();
  }

  oracledb.fetchAsString = [oracledb.CLOB];
  oracledb.fetchAsBuffer = [oracledb.BLOB];

  const connectString =  process.env.DB_CONNECT_STRING;
  if (!process.env.DB_USER || !connectString) {
    throw new Error(
      'Missing DB_USER or DB_CONNECT (or DB_CONNECT_STRING) in environment.'
    );
  }

  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    connectString,
    poolMin: Number(process.env.DB_POOL_MIN || 1),
    poolMax: Number(process.env.DB_POOL_MAX || 10),
    poolIncrement: Number(process.env.DB_POOL_INCREMENT || 1),
    stmtCacheSize: 30
  });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.execute('SELECT 1 FROM DUAL');
    console.log('Database connected successfully');
  } catch (e) {
    const detail = e && e.message ? e.message : String(e);
    console.error('Database connection failed:', detail);
    try {
      await pool.close(10);
    } catch {
      // ignore
    }
    pool = null;
    throw new Error(`Oracle connection check failed: ${detail}`);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {
        // ignore
      }
    }
  }

  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool is not initialized. Call initDb() first.');
  }
  return pool;
}

export async function getConnection() {
  const p = getPool();
  return p.getConnection();
}

/**
 * node-oracledb Pool has no execute(); acquire a connection, run, then release.
 */
export async function poolExecute(sql, binds, options) {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    return await conn.execute(sql, binds ?? {}, options ?? {});
  } finally {
    await conn.close();
  }
}

export async function closeDb() {
  if (pool) {
    await pool.close(10);
    pool = null;
  }
}

// Backward-compatible names used by existing modules
export const initializePool = initDb;
export const closePool = closeDb;

export { oracledb };
