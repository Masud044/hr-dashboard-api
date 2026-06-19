import { poolExecute, oracledb, getConnection } from '../../config/db.js'; // adjust path according to your project structure

// ── PLACE / PRODUCT KEYWORD LISTS (statement tool theke) ──
const PLACE_KEYWORDS = [
  'bunnings', '7-eleven', 'ebay', 'amazon', 'amznprime',
  'sydney water', 'linkt', 'westfield', 'officeworks',
  'service nsw', 'cityofsydney', 'norek', 'kogan',
  'fencing & gate', 'super cheap auto', 'allianz',
  'lawn industries', 'turtle transport', 'sunlight products',
  'protective film', 'eg group', 'bing lee', 'lighting mall',
  'belong', 'infotrack', 'ctown council', 'darley aluminium',
  'laumayka aluminium', 'blacktown-hills islami', 'oz home hub',
  'insulshop', 'crazy domains', 'crazydomains', 'sand 4 u',
  'turbo', 'tpg', 'amaysim', 'xero', 'fisher paykel', 'microsoft'
];
 
const PRODUCT_KEYWORDS = [
  'insurance', 'internet', 'mobile', 'direct debit',
  'loan', 'salary', 'super', 'tax office', 'xero',
  'tpg internet', 'amaysim mobile', 'belong',
  'allianz insurance', 'toyota insurance', 'return',
  'fast transfer', 'direct credit', 'credit', 'debit',
  'transfer', 'netbank', 'commbank', 'bpay'
];
 
function normalize(s) {
  let v = (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  // street-type abbreviations: normalize both directions to one canonical form
  // so "230A North Rocks Rd" matches "230A North Rocks Road" in description text
  const streetTypeMap = [
    [/\broad\b/g, 'rd'],
    [/\bstreet\b/g, 'st'],
    [/\bavenue\b/g, 'ave'],
    [/\bplace\b/g, 'pl'],
    [/\bdrive\b/g, 'dr'],
    [/\bcourt\b/g, 'ct'],
    [/\bcrescent\b/g, 'cres'],
    [/\bhighway\b/g, 'hwy'],
    [/\bparade\b/g, 'pde'],
    [/\bboulevard\b/g, 'blvd'],
    [/\blane\b/g, 'ln'],
    [/\bterrace\b/g, 'tce'],
    [/\bclose\b/g, 'cl'],
    [/\bway\b/g, 'way'],
  ];
  for (const [pattern, replacement] of streetTypeMap) {
    v = v.replace(pattern, replacement);
  }
  return v;
}
 
// ── CSV PARSER (handles quoted commas) ──
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  let row = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
        i++;
      } else if (ch === '\r') {
        i++;
      } else if (ch === '\n') {
        row.push(current.trim());
        if (row.some((c) => c !== '')) lines.push(row);
        current = '';
        row = [];
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  if (current.trim() || row.length > 0) {
    row.push(current.trim());
    if (row.some((c) => c !== '')) lines.push(row);
  }
  return lines;
}
 
function categorize(desc) {
  if (!desc) return 'other';
  const lower = normalize(desc);
  for (const kw of PLACE_KEYWORDS) {
    if (lower.includes(kw)) return 'place';
  }
  for (const kw of PRODUCT_KEYWORDS) {
    if (lower.includes(kw)) return 'product';
  }
  return 'other';
}
 
// ── PM_PROJECT theke shob project + address load kore, description-er sathe match ──
async function loadProjectAddresses() {
  const result = await poolExecute(
    `SELECT P_ID, P_NAME, P_ADDRESS, SUBWRB, POSTCODE, STATE
     FROM PM.PM_PROJECT
     WHERE P_ADDRESS IS NOT NULL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
 
  console.log('[statement] PM_PROJECT raw rows fetched:', result.rows?.length || 0);
  console.log('[statement] sample row:', JSON.stringify(result.rows?.[0]));
 
  const projects = (result.rows || []).map((r) => {
    const fullAddress = [r.P_ADDRESS, r.SUBWRB, r.POSTCODE, r.STATE]
      .filter(Boolean)
      .join(' ');
    return {
      pId: r.P_ID,
      pName: r.P_NAME,
      addressKey: normalize(r.P_ADDRESS), // primary key fragment to search against description
      fullAddress
    };
  });
 
  console.log('[statement] addressKeys built:', projects.map(p => p.addressKey));
  return projects;
}
 
function matchProject(desc, projects) {
  if (!desc) return null;
  const lower = normalize(desc);
  for (const p of projects) {
    // skip address keys that are too short/generic to be a safe match
    if (p.addressKey && p.addressKey.length >= 6 && lower.includes(p.addressKey)) {
      return p;
    }
  }
  // DEBUG: log near-misses so we can see why nothing matched
  if (lower.includes('north rocks')) {
    console.log('[statement] NO MATCH for desc:', desc);
    console.log('[statement] normalized desc:', lower);
    console.log('[statement] available addressKeys:', projects.map(p => p.addressKey));
  }
  return null;
}
 
function parseAmount(str) {
  return parseFloat(String(str || '0').replace(/,/g, '')) || 0;
}
 
function parseDate(str) {
  // expects DD/MM/YYYY - adjust if your bank export differs
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return new Date(`${y}-${m}-${d}`);
}
 
// ── MAIN: CSV text process kore staging-e insert kora row-er array banay ──
export async function processCsvToStaging(csvText, userId) {
  const rows = parseCSV(csvText);
  let dataRows = rows;
  if (rows[0] && rows[0].some((c) => /date|amount|description|balance/i.test(c))) {
    dataRows = rows.slice(1);
  }
 
  const projects = await loadProjectAddresses();
  const batchId = Date.now(); // simple unique batch id; replace with sequence if you have one
 
  const processed = [];
  for (const row of dataRows) {
    if (row.length < 4) continue;
    const [dateStr, amountStr, desc, balanceStr] = row;
    const matched = matchProject(desc, projects);
    const category = matched ? 'address' : categorize(desc);
 
    processed.push({
      uploadBatchId: batchId,
      pId: matched ? matched.pId : null,
      txnDate: parseDate(dateStr),
      amount: parseAmount(amountStr),
      description: desc || '',
      balance: parseAmount(balanceStr),
      category,
      matchedAddress: matched ? matched.fullAddress : null,
      userId
    });
  }
 
  // ── duplicate check: same TXN_DATE + AMOUNT + DESCRIPTION already exists
  //    in staging (any batch) OR main → skip re-inserting it.
  const existing = await poolExecute(
    `SELECT TXN_DATE, AMOUNT, DESCRIPTION FROM PM.PM_STATEMENT_STAGING
     UNION
     SELECT TXN_DATE, AMOUNT, DESCRIPTION FROM PM.PM_STATEMENT_MAIN`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
 
  const existingKeys = new Set(
    (existing.rows || []).map((r) =>
      `${r.TXN_DATE ? new Date(r.TXN_DATE).toDateString() : ''}|${Number(r.AMOUNT)}|${(r.DESCRIPTION || '').trim()}`
    )
  );
 
  const newRows = [];
  let skippedCount = 0;
  for (const r of processed) {
    const key = `${r.txnDate ? r.txnDate.toDateString() : ''}|${Number(r.amount)}|${r.description.trim()}`;
    if (existingKeys.has(key)) {
      skippedCount++;
      continue;
    }
    existingKeys.add(key); // also guard against duplicates within the same CSV
    newRows.push(r);
  }
 
  // Bulk insert only the new (non-duplicate) rows into staging
  for (const r of newRows) {
    await poolExecute(
      `INSERT INTO PM.PM_STATEMENT_STAGING
        (UPLOAD_BATCH_ID, P_ID, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE, CATEGORY, MATCHED_ADDRESS, STATUS, USER_ID)
       VALUES
        (:uploadBatchId, :pId, :txnDate, :amount, :description, :balance, :category, :matchedAddress, 'PENDING', :userId)`,
      r,
      { autoCommit: true }
    );
  }
 
  return { batchId, count: newRows.length, skipped: skippedCount };
}
 
// ── Sob ekta latest pending batch ber kora (refresh er por dekhanor jonno) ──
export async function getLatestPendingBatch() {
  const result = await poolExecute(
    `SELECT UPLOAD_BATCH_ID
     FROM PM.PM_STATEMENT_STAGING
     WHERE STATUS = 'PENDING'
     ORDER BY CREATION_DATE DESC
     FETCH FIRST 1 ROWS ONLY`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const row = result.rows?.[0];
  return row ? row.UPLOAD_BATCH_ID : null;
}
 
// ── Staging theke list dekha (review korar jonno) ──
export async function getStagingByBatch(batchId) {
  const result = await poolExecute(
    `SELECT s.STAGING_ID, s.UPLOAD_BATCH_ID, s.P_ID, p.P_NAME, s.TXN_DATE,
            s.AMOUNT, s.DESCRIPTION, s.BALANCE, s.CATEGORY, s.MATCHED_ADDRESS, s.STATUS
     FROM PM.PM_STATEMENT_STAGING s
     LEFT JOIN PM.PM_PROJECT p ON p.P_ID = s.P_ID
     WHERE s.UPLOAD_BATCH_ID = :batchId
     ORDER BY s.TXN_DATE DESC`,
    { batchId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows || [];
}
 
// ── "Approve & Move to Main" : selected staging_id gula main table-e move kore ──
export async function approveAndMoveToMain(stagingIds, approvedBy) {
  if (!Array.isArray(stagingIds) || stagingIds.length === 0) {
    throw new Error('No rows selected to approve.');
  }
 
  const placeholders = stagingIds.map((_, i) => `:id${i}`).join(',');
  const binds = {};
  stagingIds.forEach((id, i) => {
    binds[`id${i}`] = id;
  });
 
  // Insert into main, then delete from staging (one connection, single transaction)
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO PM.PM_STATEMENT_MAIN
        (UPLOAD_BATCH_ID, P_ID, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE, CATEGORY, MATCHED_ADDRESS, APPROVED_BY, USER_ID)
       SELECT UPLOAD_BATCH_ID, P_ID, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE, CATEGORY, MATCHED_ADDRESS, :approvedBy, USER_ID
       FROM PM.PM_STATEMENT_STAGING
       WHERE STAGING_ID IN (${placeholders})`,
      { approvedBy, ...binds }
    );
 
    await conn.execute(
      `DELETE FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID IN (${placeholders})`,
      binds
    );
 
    await conn.commit();
    return { moved: stagingIds.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}
 
// ── Main table theke list dekha (project-wise total etc) ──
export async function getMainTransactions(filters = {}) {
  let sql = `SELECT m.TXN_ID, m.UPLOAD_BATCH_ID, m.P_ID, p.P_NAME, m.TXN_DATE,
                    m.AMOUNT, m.DESCRIPTION, m.BALANCE, m.CATEGORY, m.MATCHED_ADDRESS, m.APPROVED_DATE
             FROM PM.PM_STATEMENT_MAIN m
             LEFT JOIN PM.PM_PROJECT p ON p.P_ID = m.P_ID
             WHERE 1=1`;
  const binds = {};
 
  if (filters.pId) {
    sql += ' AND m.P_ID = :pId';
    binds.pId = filters.pId;
  }
  if (filters.category) {
    sql += ' AND m.CATEGORY = :category';
    binds.category = filters.category;
  }
 
  sql += ' ORDER BY m.TXN_DATE DESC';
 
  const result = await poolExecute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return result.rows || [];
}
