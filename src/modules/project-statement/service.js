// import { poolExecute, oracledb, getConnection } from '../../config/db.js'; // adjust path according to your project structure

// // ── PLACE / PRODUCT KEYWORD LISTS (statement tool theke) ──
// const PLACE_KEYWORDS = [
//   'bunnings', '7-eleven', 'ebay', 'amazon', 'amznprime',
//   'sydney water', 'linkt', 'westfield', 'officeworks',
//   'service nsw', 'cityofsydney', 'norek', 'kogan',
//   'fencing & gate', 'super cheap auto', 'allianz',
//   'lawn industries', 'turtle transport', 'sunlight products',
//   'protective film', 'eg group', 'bing lee', 'lighting mall',
//   'belong', 'infotrack', 'ctown council', 'darley aluminium',
//   'laumayka aluminium', 'blacktown-hills islami', 'oz home hub',
//   'insulshop', 'crazy domains', 'crazydomains', 'sand 4 u',
//   'turbo', 'tpg', 'amaysim', 'xero', 'fisher paykel', 'microsoft'
// ];

// const PRODUCT_KEYWORDS = [
//   'insurance', 'internet', 'mobile', 'direct debit',
//   'loan', 'salary', 'super', 'tax office', 'xero',
//   'tpg internet', 'amaysim mobile', 'belong',
//   'allianz insurance', 'toyota insurance', 'return',
//   'fast transfer', 'direct credit', 'credit', 'debit',
//   'transfer', 'netbank', 'commbank', 'bpay'
// ];

// function normalize(s) {
//   let v = (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
//   // street-type abbreviations: normalize both directions to one canonical form
//   // so "230A North Rocks Rd" matches "230A North Rocks Road" in description text
//   const streetTypeMap = [
//     [/\broad\b/g, 'rd'],
//     [/\bstreet\b/g, 'st'],
//     [/\bavenue\b/g, 'ave'],
//     [/\bplace\b/g, 'pl'],
//     [/\bdrive\b/g, 'dr'],
//     [/\bcourt\b/g, 'ct'],
//     [/\bcrescent\b/g, 'cres'],
//     [/\bhighway\b/g, 'hwy'],
//     [/\bparade\b/g, 'pde'],
//     [/\bboulevard\b/g, 'blvd'],
//     [/\blane\b/g, 'ln'],
//     [/\bterrace\b/g, 'tce'],
//     [/\bclose\b/g, 'cl'],
//     [/\bway\b/g, 'way'],
//   ];
//   for (const [pattern, replacement] of streetTypeMap) {
//     v = v.replace(pattern, replacement);
//   }
//   return v;
// }

// // ── CSV PARSER (handles quoted commas) ──
// function parseCSV(text) {
//   const lines = [];
//   let current = '';
//   let inQuotes = false;
//   let row = [];
//   let i = 0;
//   const len = text.length;
//   while (i < len) {
//     const ch = text[i];
//     if (inQuotes) {
//       if (ch === '"') {
//         if (i + 1 < len && text[i + 1] === '"') {
//           current += '"';
//           i += 2;
//         } else {
//           inQuotes = false;
//           i++;
//         }
//       } else {
//         current += ch;
//         i++;
//       }
//     } else {
//       if (ch === '"') {
//         inQuotes = true;
//         i++;
//       } else if (ch === ',') {
//         row.push(current.trim());
//         current = '';
//         i++;
//       } else if (ch === '\r') {
//         i++;
//       } else if (ch === '\n') {
//         row.push(current.trim());
//         if (row.some((c) => c !== '')) lines.push(row);
//         current = '';
//         row = [];
//         i++;
//       } else {
//         current += ch;
//         i++;
//       }
//     }
//   }
//   if (current.trim() || row.length > 0) {
//     row.push(current.trim());
//     if (row.some((c) => c !== '')) lines.push(row);
//   }
//   return lines;
// }

// function categorize(desc) {
//   if (!desc) return 'other';
//   const lower = normalize(desc);
//   for (const kw of PLACE_KEYWORDS) {
//     if (lower.includes(kw)) return 'place';
//   }
//   for (const kw of PRODUCT_KEYWORDS) {
//     if (lower.includes(kw)) return 'product';
//   }
//   return 'other';
// }

// // ── PM_PROJECT theke shob project + address load kore, description-er sathe match ──
// async function loadProjectAddresses() {
//   const result = await poolExecute(
//     `SELECT P_ID, P_NAME, P_ADDRESS, SUBWRB, POSTCODE, STATE
//      FROM PM.PM_PROJECT
//      WHERE P_ADDRESS IS NOT NULL`,
//     {},
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );

//   console.log('[statement] PM_PROJECT raw rows fetched:', result.rows?.length || 0);
//   console.log('[statement] sample row:', JSON.stringify(result.rows?.[0]));

//   const projects = (result.rows || []).map((r) => {
//     const fullAddress = [r.P_ADDRESS, r.SUBWRB, r.POSTCODE, r.STATE]
//       .filter(Boolean)
//       .join(' ');
//     return {
//       pId: r.P_ID,
//       pName: r.P_NAME,
//       addressKey: normalize(r.P_ADDRESS), // primary key fragment to search against description
//       fullAddress
//     };
//   });

//   console.log('[statement] addressKeys built:', projects.map(p => p.addressKey));
//   return projects;
// }

// function matchProject(desc, projects) {
//   if (!desc) return null;
//   const lower = normalize(desc);
//   for (const p of projects) {
//     // skip address keys that are too short/generic to be a safe match
//     if (p.addressKey && p.addressKey.length >= 6 && lower.includes(p.addressKey)) {
//       return p;
//     }
//   }
//   // DEBUG: log near-misses so we can see why nothing matched
//   if (lower.includes('north rocks')) {
//     console.log('[statement] NO MATCH for desc:', desc);
//     console.log('[statement] normalized desc:', lower);
//     console.log('[statement] available addressKeys:', projects.map(p => p.addressKey));
//   }
//   return null;
// }

// // ── PM_CONTRACTOR_INFO theke shob active contractor load kore, description-er sathe match ──
// async function loadContractors() {
//   const result = await poolExecute(
//     `SELECT CONTRATOR_ID, CONTRATOR_NAME
//      FROM PM.PM_CONTRACTOR_INFO
//      WHERE STATUS = 1 AND CONTRATOR_NAME IS NOT NULL`,
//     {},
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );

//   return (result.rows || [])
//     .map((r) => ({
//       contractorId: r.CONTRATOR_ID,
//       contractorName: r.CONTRATOR_NAME,
//       nameKey: normalize(r.CONTRATOR_NAME)
//     }))
//     .filter((c) => c.nameKey && c.nameKey.length >= 4); // skip too-short/generic names
// }

// function matchContractor(desc, contractors) {
//   if (!desc) return null;
//   const lower = normalize(desc);
//   for (const c of contractors) {
//     if (lower.includes(c.nameKey)) {
//       return c;
//     }
//   }
//   return null;
// }

// // ── Description theke invoice number extract kora (e.g. "Inv 12345", "Invoice: 299") ──
// function extractInvoiceNo(desc) {
//   if (!desc) return null;
//   const match = desc.match( /\b(?:Inv|Invoice)\b[\s.]*?(?:No\.?\s*)?[-:#]?\s*(\d+)\b/i);
//   return match ? match[1] : null;
// }

// function parseAmount(str) {
//   return parseFloat(String(str || '0').replace(/,/g, '')) || 0;
// }

// function parseDate(str) {
//   // expects DD/MM/YYYY - adjust if your bank export differs
//   if (!str) return null;
//   const parts = str.split('/');
//   if (parts.length !== 3) return null;
//   const [d, m, y] = parts;
//   return new Date(`${y}-${m}-${d}`);
// }

// // ── MAIN: CSV text process kore staging-e insert kora row-er array banay ──
// export async function processCsvToStaging(csvText, userId) {
//   const rows = parseCSV(csvText);

//   let dataRows = rows;
//   if (rows[0] && rows[0].some((c) => /date|amount|debit|credit|description|balance|narration/i.test(c))) {
//     dataRows = rows.slice(1);
//   }

//   const projects = await loadProjectAddresses();
//   const contractors = await loadContractors();
//   const batchId = Date.now();

//   const processed = [];
//   for (const row of dataRows) {
//     // ── 3 বা 4 column দুটোই support করো ──
//     if (row.length < 3) continue;

//     const dateStr    = row[0];
//     const amountStr  = row[1];
//     const desc       = row[2];
//     const balanceStr = row[3] || null; // Balance না থাকলে null

//     const matchedProject    = matchProject(desc, projects);
//     const matchedContractor = matchContractor(desc, contractors);
//     const category          = matchedProject ? 'address' : categorize(desc);
//     const invoiceNo         = extractInvoiceNo(desc);

//     processed.push({
//       uploadBatchId:   batchId,
//       pId:             matchedProject ? matchedProject.pId : null,
//       projectName:     matchedProject ? matchedProject.pName : null,
//       txnDate:         parseDate(dateStr),
//       amount:          parseAmount(amountStr),
//       description:     desc || '',
//       balance:         balanceStr !== null ? parseAmount(balanceStr) : null,
//       category,
//       matchedAddress:  matchedProject ? matchedProject.fullAddress : null,
//       contractorId:    matchedContractor ? matchedContractor.contractorId : null,
//       contractorName:  matchedContractor ? matchedContractor.contractorName : null,
//       invoiceNo:       invoiceNo || null,
//       userId
//     });
//   }

//   const batchKeys = new Set();
//   const newRows   = [];
//   let skippedCount = 0;

//   for (const r of processed) {
//     const key = `${toDateKey(r.txnDate)}|${Number(r.amount)}|${r.description.trim()}`;
//     if (batchKeys.has(key)) {
//       skippedCount++;
//       continue;
//     }
//     batchKeys.add(key);
//     newRows.push(r);
//   }

//   for (const r of newRows) {
//     await poolExecute(
//       `INSERT INTO PM.PM_STATEMENT_STAGING
//         (UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
//          CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO, STATUS, USER_ID)
//        VALUES
//         (:uploadBatchId, :pId, :projectName, :txnDate, :amount, :description, :balance,
//          :category, :matchedAddress, :contractorId, :contractorName, :invoiceNo, 'PENDING', :userId)`,
//       r,
//       { autoCommit: true }
//     );
//   }

//   return { batchId, count: newRows.length, skipped: skippedCount };
// }

// // ── Sob ekta latest pending batch ber kora (refresh er por dekhanor jonno) ──
// export async function getLatestPendingBatch() {
//   const result = await poolExecute(
//     `SELECT UPLOAD_BATCH_ID
//      FROM PM.PM_STATEMENT_STAGING
//      WHERE STATUS = 'PENDING'
//      ORDER BY CREATION_DATE DESC
//      FETCH FIRST 1 ROWS ONLY`,
//     {},
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const row = result.rows?.[0];
//   return row ? row.UPLOAD_BATCH_ID : null;
// }

// // ── Staging theke list dekha (review korar jonno) ──
// export async function getStagingByBatch(batchId) {
//   const result = await poolExecute(
//     `SELECT s.STAGING_ID, s.UPLOAD_BATCH_ID, s.P_ID, s.PROJECT_NAME, s.TXN_DATE,
//             s.AMOUNT, s.DESCRIPTION, s.BALANCE, s.CATEGORY, s.MATCHED_ADDRESS,
//             s.CONTRACTOR_ID, s.CONTRACTOR_NAME, s.INVOICE_NO,
//             s.INVOICE_FILE_NAME, s.INVOICE_FILE_TYPE, s.INVOICE_FILE_SIZE, s.STATUS
//      FROM PM.PM_STATEMENT_STAGING s
//      WHERE s.UPLOAD_BATCH_ID = :batchId
//      ORDER BY s.TXN_DATE DESC`,
//     { batchId },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   return result.rows || [];
// }

// // ── Dropdown-er jonno: shob project list (manual select korar jonno) ──
// export async function getAllProjects() {
//   const result = await poolExecute(
//     `SELECT P_ID, P_NAME FROM PM.PM_PROJECT ORDER BY P_NAME`,
//     {},
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   return result.rows || [];
// }

// // ── Dropdown-er jonno: shob active contractor list (manual select korar jonno) ──
// export async function getAllContractors() {
//   const result = await poolExecute(
//     `SELECT CONTRATOR_ID, CONTRATOR_NAME FROM PM.PM_CONTRACTOR_INFO
//      WHERE STATUS = 1 ORDER BY CONTRATOR_NAME`,
//     {},
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   return result.rows || [];
// }

// // ── Ekta staging row-e manually project/contractor/invoice set kora (dropdown / text input theke) ──
// export async function updateStagingRow(stagingId, updates) {
//   const fields = [];
//   const binds = { stagingId };

//   if (updates.pId !== undefined) {
//     fields.push('P_ID = :pId', 'PROJECT_NAME = :projectName');
//     binds.pId = updates.pId || null;
//     binds.projectName = updates.projectName || null;
//   }
//   if (updates.contractorId !== undefined) {
//     fields.push('CONTRACTOR_ID = :contractorId', 'CONTRACTOR_NAME = :contractorName');
//     binds.contractorId = updates.contractorId || null;
//     binds.contractorName = updates.contractorName || null;
//   }
//   if (updates.invoiceNo !== undefined) {
//     fields.push('INVOICE_NO = :invoiceNo');
//     binds.invoiceNo = updates.invoiceNo || null;
//   }

//   if (fields.length === 0) return { updated: false };

//   await poolExecute(
//     `UPDATE PM.PM_STATEMENT_STAGING SET ${fields.join(', ')} WHERE STAGING_ID = :stagingId`,
//     binds,
//     { autoCommit: true }
//   );
//   return { updated: true };
// }

// // ── Invoice file upload (BLOB) - staging row-e attach kora ──
// export async function uploadInvoiceFile(stagingId, file) {
//   await poolExecute(
//     `UPDATE PM.PM_STATEMENT_STAGING
//      SET INVOICE_FILE = :fileData,
//          INVOICE_FILE_NAME = :fileName,
//          INVOICE_FILE_TYPE = :fileType,
//          INVOICE_FILE_SIZE = :fileSize
//      WHERE STAGING_ID = :stagingId`,
//     {
//       stagingId,
//       fileData: { val: file.buffer, type: oracledb.BLOB },
//       fileName: file.originalname,
//       fileType: file.mimetype,
//       fileSize: file.size
//     },
//     { autoCommit: true }
//   );
//   return { uploaded: true };
// }

// // ── Invoice file download/view ──
// export async function getInvoiceFile(stagingId) {
//   const result = await poolExecute(
//     `SELECT INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE
//      FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID = :stagingId`,
//     { stagingId },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const row = result.rows?.[0];
//   if (!row || !row.INVOICE_FILE) return null;

//   // BLOB lob -> buffer
//   const lob = row.INVOICE_FILE;
//   const chunks = [];
//   await new Promise((resolve, reject) => {
//     lob.on('data', (chunk) => chunks.push(chunk));
//     lob.on('end', resolve);
//     lob.on('error', reject);
//   });

//   return {
//     buffer: Buffer.concat(chunks),
//     fileName: row.INVOICE_FILE_NAME,
//     fileType: row.INVOICE_FILE_TYPE
//   };
// }

// // ── "Approve & Move to Main" : selected staging_id gula main table-e move kore ──
// export async function approveAndMoveToMain(stagingIds, approvedBy) {
//   if (!Array.isArray(stagingIds) || stagingIds.length === 0) {
//     throw new Error('No rows selected to approve.');
//   }

//   const placeholders = stagingIds.map((_, i) => `:id${i}`).join(',');
//   const binds = {};
//   stagingIds.forEach((id, i) => {
//     binds[`id${i}`] = id;
//   });

//   // Insert into main, then delete from staging (one connection, single transaction)
//   const conn = await getConnection();
//   try {
//     await conn.execute(
//       `INSERT INTO PM.PM_STATEMENT_MAIN
//         (UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
//          CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
//          INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
//          APPROVED_BY, USER_ID)
//        SELECT UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
//               CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
//               INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
//               :approvedBy, USER_ID
//        FROM PM.PM_STATEMENT_STAGING
//        WHERE STAGING_ID IN (${placeholders})`,
//       { approvedBy, ...binds }
//     );

//     await conn.execute(
//       `DELETE FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID IN (${placeholders})`,
//       binds
//     );

//     await conn.commit();
//     return { moved: stagingIds.length };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// }

// // ── Main table theke list dekha (project-wise total etc) ──
// export async function getMainTransactions(filters = {}) {
//   let sql = `SELECT m.TXN_ID, m.UPLOAD_BATCH_ID, m.P_ID, m.PROJECT_NAME, m.TXN_DATE,
//                     m.AMOUNT, m.DESCRIPTION, m.BALANCE, m.CATEGORY, m.MATCHED_ADDRESS,
//                     m.CONTRACTOR_ID, m.CONTRACTOR_NAME, m.INVOICE_NO,
//                     m.INVOICE_FILE_NAME, m.INVOICE_FILE_TYPE, m.INVOICE_FILE_SIZE,
//                     m.APPROVED_DATE
//              FROM PM.PM_STATEMENT_MAIN m
//              WHERE 1=1`;
//   const binds = {};

//   if (filters.pId) {
//     sql += ' AND m.P_ID = :pId';
//     binds.pId = filters.pId;
//   }
//   if (filters.category) {
//     sql += ' AND m.CATEGORY = :category';
//     binds.category = filters.category;
//   }

//   sql += ' ORDER BY m.TXN_DATE DESC';

//   const result = await poolExecute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//   return result.rows || [];
// }

// function toDateKey(val) {
//   if (!val) return '';
//   const d = val instanceof Date ? val : new Date(val);
//   if (isNaN(d.getTime())) return '';
//   return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
// }



// // ── Staging-এর সব PENDING row-এ invoice no আবার extract করো (regex update হলে call করো) ──
// // export async function reExtractInvoiceNos(batchId) {
// //   const result = await poolExecute(
// //     `SELECT STAGING_ID, DESCRIPTION 
// //      FROM PM.PM_STATEMENT_STAGING 
// //      WHERE STATUS = 'PENDING'
// //      ${batchId ? 'AND UPLOAD_BATCH_ID = :batchId' : ''}`,
// //     batchId ? { batchId } : {},
// //     { outFormat: oracledb.OUT_FORMAT_OBJECT }
// //   );

// //   const rows = result.rows || [];
// //   let updatedCount = 0;

// //   for (const row of rows) {
// //     const newInvoiceNo = extractInvoiceNo(row.DESCRIPTION);
// //     await poolExecute(
// //       `UPDATE PM.PM_STATEMENT_STAGING 
// //        SET INVOICE_NO = :invoiceNo 
// //        WHERE STAGING_ID = :stagingId`,
// //       { invoiceNo: newInvoiceNo || null, stagingId: row.STAGING_ID },
// //       { autoCommit: true }
// //     );
// //     updatedCount++;
// //   }

// //   return { updated: updatedCount };
// // }


// export async function getMainInvoiceFile(txnId) {
//   const result = await poolExecute(
//     `SELECT INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE
//      FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :txnId`,
//     { txnId },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const row = result.rows?.[0];
//   if (!row || !row.INVOICE_FILE) return null;

//   const lob = row.INVOICE_FILE;
//   const chunks = [];
//   await new Promise((resolve, reject) => {
//     lob.on('data', (chunk) => chunks.push(chunk));
//     lob.on('end', resolve);
//     lob.on('error', reject);
//   });

//   return {
//     buffer: Buffer.concat(chunks),
//     fileName: row.INVOICE_FILE_NAME,
//     fileType: row.INVOICE_FILE_TYPE
//   };
// }


import { poolExecute, oracledb, getConnection } from '../../config/db.js';

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
  const streetTypeMap = [
    [/\broad\b/g, 'rd'], [/\bstreet\b/g, 'st'], [/\bavenue\b/g, 'ave'],
    [/\bplace\b/g, 'pl'], [/\bdrive\b/g, 'dr'], [/\bcourt\b/g, 'ct'],
    [/\bcrescent\b/g, 'cres'], [/\bhighway\b/g, 'hwy'], [/\bparade\b/g, 'pde'],
    [/\bboulevard\b/g, 'blvd'], [/\blane\b/g, 'ln'], [/\bterrace\b/g, 'tce'],
    [/\bclose\b/g, 'cl'], [/\bway\b/g, 'way'],
  ];
  for (const [pattern, replacement] of streetTypeMap) {
    v = v.replace(pattern, replacement);
  }
  return v;
}

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
        if (i + 1 < len && text[i + 1] === '"') { current += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { current += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ',') { row.push(current.trim()); current = ''; i++; }
      else if (ch === '\r') { i++; }
      else if (ch === '\n') {
        row.push(current.trim());
        if (row.some((c) => c !== '')) lines.push(row);
        current = ''; row = []; i++;
      } else { current += ch; i++; }
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
  for (const kw of PLACE_KEYWORDS) { if (lower.includes(kw)) return 'place'; }
  for (const kw of PRODUCT_KEYWORDS) { if (lower.includes(kw)) return 'product'; }
  return 'other';
}

async function loadProjectAddresses() {
  const result = await poolExecute(
    `SELECT P_ID, P_NAME, P_ADDRESS, SUBWRB, POSTCODE, STATE
     FROM PM.PM_PROJECT WHERE P_ADDRESS IS NOT NULL`,
    {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return (result.rows || []).map((r) => ({
    pId: r.P_ID, pName: r.P_NAME,
    addressKey: normalize(r.P_ADDRESS),
    fullAddress: [r.P_ADDRESS, r.SUBWRB, r.POSTCODE, r.STATE].filter(Boolean).join(' ')
  }));
}

function matchProject(desc, projects) {
  if (!desc) return null;
  const lower = normalize(desc);
  for (const p of projects) {
    if (p.addressKey && p.addressKey.length >= 6 && lower.includes(p.addressKey)) return p;
  }
  return null;
}

async function loadContractors() {
  const result = await poolExecute(
    `SELECT CONTRATOR_ID, CONTRATOR_NAME FROM PM.PM_CONTRACTOR_INFO
     WHERE STATUS = 1 AND CONTRATOR_NAME IS NOT NULL`,
    {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return (result.rows || [])
    .map((r) => ({ contractorId: r.CONTRATOR_ID, contractorName: r.CONTRATOR_NAME, nameKey: normalize(r.CONTRATOR_NAME) }))
    .filter((c) => c.nameKey && c.nameKey.length >= 4);
}

function matchContractor(desc, contractors) {
  if (!desc) return null;
  const lower = normalize(desc);
  for (const c of contractors) { if (lower.includes(c.nameKey)) return c; }
  return null;
}

function extractInvoiceNo(desc) {
  if (!desc) return null;
  const match = desc.match(/\b(?:Inv|Invoice)\b[\s.]*?(?:No\.?\s*)?[-:#]?\s*(\d+)\b/i);
  return match ? match[1] : null;
}

function parseAmount(str) {
  return parseFloat(String(str || '0').replace(/,/g, '')) || 0;
}

function parseDate(str) {
  if (!str) return null;
  str = str.trim();
  let match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    const date = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00`);
    return isNaN(date.getTime()) ? null : date;
  }
  match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(`${y}-${m}-${d}T00:00:00`);
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

function toDateKey(val) {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── CSV upload: duplicate check staging + main উভয় থেকে (3-field exact match) ──
export async function processCsvToStaging(csvText, userId) {
  const rows = parseCSV(csvText);
  let dataRows = rows;
  if (rows[0] && rows[0].some((c) => /date|amount|debit|credit|description|balance|narration/i.test(c))) {
    dataRows = rows.slice(1);
  }

  const projects    = await loadProjectAddresses();
  const contractors = await loadContractors();
  const batchId     = Date.now();

  // ── existing keys: staging + main উভয় থেকে (date+amount+description 3টা match) ──
  const existingResult = await poolExecute(
    `SELECT TXN_DATE, AMOUNT, DESCRIPTION FROM PM.PM_STATEMENT_STAGING
     UNION ALL
     SELECT TXN_DATE, AMOUNT, DESCRIPTION FROM PM.PM_STATEMENT_MAIN`,
    {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const existingKeys = new Set(
    (existingResult.rows || []).map((r) =>
      `${toDateKey(r.TXN_DATE)}|${Number(r.AMOUNT)}|${(r.DESCRIPTION || '').trim().toLowerCase()}`
    )
  );

  const processed = [];
  for (const row of dataRows) {
    if (row.length < 3) continue;
    const dateStr    = row[0];
    const amountStr  = row[1];
    const desc       = row[2];
    const balanceStr = row[3] || null;

    const txnDate = parseDate(dateStr);
    const amount  = parseAmount(amountStr);

    // ── 3-field exact duplicate check ──
    const key = `${toDateKey(txnDate)}|${Number(amount)}|${(desc || '').trim().toLowerCase()}`;
    if (existingKeys.has(key)) continue; // staging বা main-এ already আছে → skip
    existingKeys.add(key); // same CSV-এর মধ্যে duplicate guard

    const matchedProject    = matchProject(desc, projects);
    const matchedContractor = matchContractor(desc, contractors);
    const category          = matchedProject ? 'address' : categorize(desc);
    const invoiceNo         = extractInvoiceNo(desc);

    processed.push({
      uploadBatchId:   batchId,
      pId:             matchedProject ? matchedProject.pId : null,
      projectName:     matchedProject ? matchedProject.pName : null,
      txnDate,
      amount,
      description:     desc || '',
      balance:         balanceStr !== null ? parseAmount(balanceStr) : null,
      category,
      matchedAddress:  matchedProject ? matchedProject.fullAddress : null,
      contractorId:    matchedContractor ? matchedContractor.contractorId : null,
      contractorName:  matchedContractor ? matchedContractor.contractorName : null,
      invoiceNo:       invoiceNo || null,
      sourceType:      'BANKING',
      remarks:         null,
      userId
    });
  }

  for (const r of processed) {
    await poolExecute(
      `INSERT INTO PM.PM_STATEMENT_STAGING
        (UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
         CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
         SOURCE_TYPE, REMARKS, STATUS, USER_ID)
       VALUES
        (:uploadBatchId, :pId, :projectName, :txnDate, :amount, :description, :balance,
         :category, :matchedAddress, :contractorId, :contractorName, :invoiceNo,
         :sourceType, :remarks, 'PENDING', :userId)`,
      r, { autoCommit: true }
    );
  }

  return { batchId, count: processed.length, skipped: 0 };
}

export async function getLatestPendingBatch() {
  const result = await poolExecute(
    `SELECT UPLOAD_BATCH_ID FROM PM.PM_STATEMENT_STAGING
     WHERE STATUS = 'PENDING' ORDER BY CREATION_DATE DESC FETCH FIRST 1 ROWS ONLY`,
    {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const row = result.rows?.[0];
  return row ? row.UPLOAD_BATCH_ID : null;
}

export async function getStagingByBatch(batchId) {
  const result = await poolExecute(
    `SELECT s.STAGING_ID, s.UPLOAD_BATCH_ID, s.P_ID, s.PROJECT_NAME, s.TXN_DATE,
            s.AMOUNT, s.DESCRIPTION, s.BALANCE, s.CATEGORY, s.MATCHED_ADDRESS,
            s.CONTRACTOR_ID, s.CONTRACTOR_NAME, s.INVOICE_NO,
            s.INVOICE_FILE_NAME, s.INVOICE_FILE_TYPE, s.INVOICE_FILE_SIZE,
            s.SOURCE_TYPE, s.REMARKS, s.STATUS
     FROM PM.PM_STATEMENT_STAGING s
     WHERE s.UPLOAD_BATCH_ID = :batchId
     ORDER BY s.TXN_DATE DESC`,
    { batchId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows || [];
}

export async function getAllProjects() {
  const result = await poolExecute(
    `SELECT P_ID, P_NAME FROM PM.PM_PROJECT ORDER BY P_NAME`,
    {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows || [];
}

export async function getAllContractors() {
  const result = await poolExecute(
    `SELECT CONTRATOR_ID, CONTRATOR_NAME FROM PM.PM_CONTRACTOR_INFO
     WHERE STATUS = 1 ORDER BY CONTRATOR_NAME`,
    {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows || [];
}

export async function updateStagingRow(stagingId, updates) {
  const fields = [];
  const binds  = { stagingId };

  if (updates.pId !== undefined) {
    fields.push('P_ID = :pId', 'PROJECT_NAME = :projectName');
    binds.pId = updates.pId || null;
    binds.projectName = updates.projectName || null;
  }
  if (updates.contractorId !== undefined) {
    fields.push('CONTRACTOR_ID = :contractorId', 'CONTRACTOR_NAME = :contractorName');
    binds.contractorId = updates.contractorId || null;
    binds.contractorName = updates.contractorName || null;
  }
  if (updates.invoiceNo !== undefined) {
    fields.push('INVOICE_NO = :invoiceNo');
    binds.invoiceNo = updates.invoiceNo || null;
  }
  if (updates.remarks !== undefined) {
    fields.push('REMARKS = :remarks');
    binds.remarks = updates.remarks || null;
  }

  if (fields.length === 0) return { updated: false };

  await poolExecute(
    `UPDATE PM.PM_STATEMENT_STAGING SET ${fields.join(', ')} WHERE STAGING_ID = :stagingId`,
    binds, { autoCommit: true }
  );
  return { updated: true };
}

export async function uploadInvoiceFile(stagingId, file) {
  await poolExecute(
    `UPDATE PM.PM_STATEMENT_STAGING
     SET INVOICE_FILE = :fileData, INVOICE_FILE_NAME = :fileName,
         INVOICE_FILE_TYPE = :fileType, INVOICE_FILE_SIZE = :fileSize
     WHERE STAGING_ID = :stagingId`,
    {
      stagingId,
      fileData: { val: file.buffer, type: oracledb.BLOB },
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size
    }, { autoCommit: true }
  );
  return { uploaded: true };
}

export async function getInvoiceFile(stagingId) {
  const result = await poolExecute(
    `SELECT INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE
     FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID = :stagingId`,
    { stagingId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const row = result.rows?.[0];
  if (!row || !row.INVOICE_FILE) return null;
  const lob = row.INVOICE_FILE;
  const chunks = [];
  await new Promise((resolve, reject) => {
    lob.on('data', (chunk) => chunks.push(chunk));
    lob.on('end', resolve);
    lob.on('error', reject);
  });
  return { buffer: Buffer.concat(chunks), fileName: row.INVOICE_FILE_NAME, fileType: row.INVOICE_FILE_TYPE };
}

// ── Approve: staging থেকে DELETE করে না, STATUS = 'APPROVED' করে ──
export async function approveAndMoveToMain(stagingIds, approvedBy) {
  if (!Array.isArray(stagingIds) || stagingIds.length === 0) {
    throw new Error('No rows selected to approve.');
  }

  const placeholders = stagingIds.map((_, i) => `:id${i}`).join(',');
  const binds = {};
  stagingIds.forEach((id, i) => { binds[`id${i}`] = id; });

  const conn = await getConnection();
  try {
    // Main-এ insert করো
    await conn.execute(
      `INSERT INTO PM.PM_STATEMENT_MAIN
        (UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
         CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
         INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
         SOURCE_TYPE, REMARKS, APPROVED_BY, APPROVED_DATE, USER_ID)
       SELECT UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
              CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
              INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
              SOURCE_TYPE, REMARKS, :approvedBy, SYSDATE, USER_ID
       FROM PM.PM_STATEMENT_STAGING
       WHERE STAGING_ID IN (${placeholders})`,
      { approvedBy, ...binds }
    );

    // ── DELETE করা হচ্ছে না — STATUS = 'APPROVED' করো ──
    await conn.execute(
      `UPDATE PM.PM_STATEMENT_STAGING
       SET STATUS = 'APPROVED'
       WHERE STAGING_ID IN (${placeholders})`,
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

// ── Non-banking manual entry insert ──
export async function insertNonBankingEntry(data, userId) {
  const batchId = Date.now();
  const {
    txnDate, amount, description, pId, projectName,
    contractorId, contractorName, invoiceNo, remarks
  } = data;

  const matchedProject    = pId ? { pId, pName: projectName } : null;
  const matchedContractor = contractorId ? { contractorId, contractorName } : null;

  await poolExecute(
    `INSERT INTO PM.PM_STATEMENT_STAGING
      (UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
       CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
       SOURCE_TYPE, REMARKS, STATUS, USER_ID)
     VALUES
      (:uploadBatchId, :pId, :projectName, :txnDate, :amount, :description, NULL,
       :category, NULL, :contractorId, :contractorName, :invoiceNo,
       'NON_BANKING', :remarks, 'PENDING', :userId)`,
    {
      uploadBatchId: batchId,
      pId:           matchedProject ? matchedProject.pId : null,
      projectName:   matchedProject ? matchedProject.pName : null,
      txnDate:       txnDate ? new Date(txnDate) : null,
      amount:        parseAmount(String(amount)),
      description:   description || '',
      category:      'other',
      contractorId:  matchedContractor ? matchedContractor.contractorId : null,
      contractorName:matchedContractor ? matchedContractor.contractorName : null,
      invoiceNo:     invoiceNo || null,
      remarks:       remarks || null,
      userId
    }, { autoCommit: true }
  );

  return { batchId };
}

export async function getMainTransactions(filters = {}) {
  let sql = `SELECT m.TXN_ID, m.UPLOAD_BATCH_ID, m.P_ID, m.PROJECT_NAME, m.TXN_DATE,
                    m.AMOUNT, m.DESCRIPTION, m.BALANCE, m.CATEGORY, m.MATCHED_ADDRESS,
                    m.CONTRACTOR_ID, m.CONTRACTOR_NAME, m.INVOICE_NO,
                    m.INVOICE_FILE_NAME, m.INVOICE_FILE_TYPE, m.INVOICE_FILE_SIZE,
                    m.SOURCE_TYPE, m.REMARKS, m.APPROVED_DATE
             FROM PM.PM_STATEMENT_MAIN m WHERE 1=1`;
  const binds = {};

  if (filters.pId)      { sql += ' AND m.P_ID = :pId';           binds.pId = filters.pId; }
  if (filters.category) { sql += ' AND m.CATEGORY = :category';  binds.category = filters.category; }
  if (filters.sourceType) { sql += ' AND m.SOURCE_TYPE = :sourceType'; binds.sourceType = filters.sourceType; }

  sql += ' ORDER BY m.TXN_DATE DESC';
  const result = await poolExecute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return result.rows || [];
}

export async function getMainInvoiceFile(txnId) {
  const result = await poolExecute(
    `SELECT INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE
     FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :txnId`,
    { txnId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const row = result.rows?.[0];
  if (!row || !row.INVOICE_FILE) return null;
  const lob = row.INVOICE_FILE;
  const chunks = [];
  await new Promise((resolve, reject) => {
    lob.on('data', (chunk) => chunks.push(chunk));
    lob.on('end', resolve);
    lob.on('error', reject);
  });
  return { buffer: Buffer.concat(chunks), fileName: row.INVOICE_FILE_NAME, fileType: row.INVOICE_FILE_TYPE };
}