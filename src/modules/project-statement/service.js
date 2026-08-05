// src\modules\project-statement\service.js
import { poolExecute, oracledb, getConnection } from "../../config/db.js";
import { getWorkerCostsByProject } from "../worker-attendance/service.js";

const PLACE_KEYWORDS = [
  "bunnings",
  "7-eleven",
  "ebay",
  "amazon",
  "amznprime",
  "sydney water",
  "linkt",
  "westfield",
  "officeworks",
  "service nsw",
  "cityofsydney",
  "norek",
  "kogan",
  "fencing & gate",
  "super cheap auto",
  "allianz",
  "lawn industries",
  "turtle transport",
  "sunlight products",
  "protective film",
  "eg group",
  "bing lee",
  "lighting mall",
  "belong",
  "infotrack",
  "ctown council",
  "darley aluminium",
  "laumayka aluminium",
  "blacktown-hills islami",
  "oz home hub",
  "insulshop",
  "crazy domains",
  "crazydomains",
  "sand 4 u",
  "turbo",
  "tpg",
  "amaysim",
  "xero",
  "fisher paykel",
  "microsoft",
];

const PRODUCT_KEYWORDS = [
  "insurance",
  "internet",
  "mobile",
  "direct debit",
  "loan",
  "salary",
  "super",
  "tax office",
  "xero",
  "tpg internet",
  "amaysim mobile",
  "belong",
  "allianz insurance",
  "toyota insurance",
  "return",
  "fast transfer",
  "direct credit",
  "credit",
  "debit",
  "transfer",
  "netbank",
  "commbank",
  "bpay",
];

function normalize(s) {
  let v = (s || "").toLowerCase().trim().replace(/\s+/g, " ");
  const streetTypeMap = [
    [/\broad\b/g, "rd"],
    [/\bstreet\b/g, "st"],
    [/\bavenue\b/g, "ave"],
    [/\bplace\b/g, "pl"],
    [/\bdrive\b/g, "dr"],
    [/\bcourt\b/g, "ct"],
    [/\bcrescent\b/g, "cres"],
    [/\bhighway\b/g, "hwy"],
    [/\bparade\b/g, "pde"],
    [/\bboulevard\b/g, "blvd"],
    [/\blane\b/g, "ln"],
    [/\bterrace\b/g, "tce"],
    [/\bclose\b/g, "cl"],
    [/\bway\b/g, "way"],
  ];
  for (const [pattern, replacement] of streetTypeMap)
    v = v.replace(pattern, replacement);
  return v;
}

const STOP_WORDS = new Set([
  "rd",
  "st",
  "ave",
  "pl",
  "dr",
  "ct",
  "cres",
  "hwy",
  "pde",
  "blvd",
  "ln",
  "tce",
  "cl",
  "way",
  "street",
  "road",
  "avenue",
  "place",
  "drive",
  "court",
  "crescent",
  "highway",
  "parade",
  "boulevard",
  "lane",
  "terrace",
  "close",
  "nsw",
  "vic",
  "qld",
  "sa",
  "wa",
  "act",
  "nt",
  "tas",
  "pty",
  "ltd",
  "llc",
  "inc",
  "corp",
  "co",
  "the",
  "and",
  "group",
  // "construction",
  // "constructions",
  "services",
  "service",
  "company",
]);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// function extractKeywords(...strings) {
//   const combined = strings.filter(Boolean).join(" ");
//   const norm = normalize(combined);
//   const words = norm.split(/[^a-z0-9]+/).filter(Boolean);
//   return [
//     ...new Set(
//       words.filter(
//         (w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w),
//       ),
//     ),
//   ];
// }

function extractKeywords(...strings) {
  const combined = strings.filter(Boolean).join(" ");
  const norm = normalize(combined);
  const words = norm.split(/[^a-z0-9]+/).filter(Boolean);
  return [
    ...new Set(
      words.filter((w) => {
        const isNumeric = /^\d+$/.test(w);
        // keep numeric tokens (street numbers) regardless of length —
        // these are exactly what distinguish "291 Bungarribee Rd" from
        // "33 Henry Kater Ave" when both share a suburb name
        if (isNumeric) return true;
        return w.length >= 3 && !STOP_WORDS.has(w);
      }),
    ),
  ];
}

function parseCSV(text) {
  const lines = [];
  let current = "",
    inQuotes = false,
    row = [],
    i = 0;
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
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
        i++;
      } else if (ch === "\r") {
        i++;
      } else if (ch === "\n") {
        row.push(current.trim());
        if (row.some((c) => c !== "")) lines.push(row);
        current = "";
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
    if (row.some((c) => c !== "")) lines.push(row);
  }
  return lines;
}

function categorize(desc) {
  if (!desc) return "other";
  const lower = normalize(desc);
  for (const kw of PLACE_KEYWORDS) {
    if (lower.includes(kw)) return "place";
  }
  for (const kw of PRODUCT_KEYWORDS) {
    if (lower.includes(kw)) return "product";
  }
  return "other";
}

// async function loadProjectAddresses() {
//   const result = await poolExecute(
//     `SELECT P_ID, P_NAME, P_ADDRESS, SUBWRB, POSTCODE, STATE FROM PM.PM_PROJECT WHERE P_ADDRESS IS NOT NULL`,
//     {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   return (result.rows || []).map((r) => ({
//     pId: r.P_ID, pName: r.P_NAME,
//     addressKey: normalize(r.P_ADDRESS),
//     fullAddress: [r.P_ADDRESS, r.SUBWRB, r.POSTCODE, r.STATE].filter(Boolean).join(' ')
//   }));
// }

// async function loadProjectAddresses() {
//   const result = await poolExecute(
//     `SELECT P_ID, P_NAME, P_ADDRESS, SUBWRB, POSTCODE, STATE FROM PM.PM_PROJECT WHERE P_NAME IS NOT NULL`,
//     {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   return (result.rows || []).map((r) => ({
//     pId: r.P_ID,
//     pName: r.P_NAME,
//     // ── শুধু P_NAME থেকে keyword বের করা হলো (P_ADDRESS/SUBWRB আর ব্যবহার হচ্ছে না matching-এ) ──
//     keywords: extractKeywords(r.P_NAME),
//     // ── display/CSV এর জন্য full address তথ্য রাখা হলো, matching-এ প্রভাব ফেলে না ──
//     fullAddress: [r.P_ADDRESS, r.SUBWRB, r.POSTCODE, r.STATE].filter(Boolean).join(' ') || r.P_NAME
//   })).filter((p) => p.keywords.length > 0);
// }
async function loadProjectAddresses() {
  const result = await poolExecute(
    `SELECT P_ID, P_NAME, P_ADDRESS, SUBWRB, POSTCODE, STATE FROM PM.PM_PROJECT WHERE P_NAME IS NOT NULL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  return (result.rows || [])
    .map((r) => {
      const keywords = extractKeywords(r.P_NAME);
      return {
        pId: r.P_ID,
        pName: r.P_NAME,
        keywords,
        // ── regex একবারই বানানো হলো, প্রতি row-এ rebuild করা হবে না (perf fix) ──
        regexes: keywords.map((kw) => new RegExp(`\\b${escapeRegex(kw)}\\b`)),
        fullAddress:
          [r.P_ADDRESS, r.SUBWRB, r.POSTCODE, r.STATE]
            .filter(Boolean)
            .join(" ") || r.P_NAME,
      };
    })
    .filter((p) => p.keywords.length > 0);
}
// function matchProject(desc, projects) {
//   if (!desc) return null;
//   const lower = normalize(desc);
//   for (const p of projects) {
//     if (p.addressKey && p.addressKey.length >= 6 && lower.includes(p.addressKey)) return p;
//   }
//   return null;
// }
// function matchProject(desc, projects) {
//   if (!desc) return null;
//   const descNorm = normalize(desc);
//   let best = null, bestScore = 0;

//   for (const p of projects) {
//     let score = 0;
//     for (const kw of p.keywords) {
//       const re = new RegExp(`\\b${escapeRegex(kw)}\\b`);
//       if (re.test(descNorm)) score += kw.length;
//     }
//     if (score > bestScore) { bestScore = score; best = p; }
//   }

//   return bestScore >= 4 ? best : null;
// }
function matchProject(desc, projects) {
  if (!desc) return null;
  const descNorm = normalize(desc);
  let best = null,
    bestScore = 0;

  for (const p of projects) {
    let score = 0;
    for (let i = 0; i < p.regexes.length; i++) {
      if (p.regexes[i].test(descNorm)) score += p.keywords[i].length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return bestScore >= 4 ? best : null;
}

// async function loadContractors() {
//   const result = await poolExecute(
//     `SELECT CONTRATOR_ID, CONTRATOR_NAME FROM PM.PM_CONTRACTOR_INFO WHERE STATUS = 1 AND CONTRATOR_NAME IS NOT NULL`,
//     {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   return (result.rows || [])
//     .map((r) => ({ contractorId: r.CONTRATOR_ID, contractorName: r.CONTRATOR_NAME, nameKey: normalize(r.CONTRATOR_NAME) }))
//     .filter((c) => c.nameKey && c.nameKey.length >= 4);
// }

// async function loadContractors() {
//   const result = await poolExecute(
//     `SELECT CONTRATOR_ID, CONTRATOR_NAME FROM PM.PM_CONTRACTOR_INFO WHERE STATUS = 1 AND CONTRATOR_NAME IS NOT NULL`,
//     {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   return (result.rows || [])
//     .map((r) => ({
//       contractorId: r.CONTRATOR_ID,
//       contractorName: r.CONTRATOR_NAME,
//       // ── "Pty Ltd", "Construction" ইত্যাদি বাদ দিয়ে আসল নাম keyword হিসেবে রাখা হলো ──
//       keywords: extractKeywords(r.CONTRATOR_NAME),
//     }))
//     .filter((c) => c.keywords.length > 0);
// }

async function loadContractors() {
  const result = await poolExecute(
    `SELECT CONTRATOR_ID, CONTRATOR_NAME FROM PM.PM_CONTRACTOR_INFO WHERE STATUS = 1 AND CONTRATOR_NAME IS NOT NULL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  return (result.rows || [])
    .map((r) => {
      const keywords = extractKeywords(r.CONTRATOR_NAME);
      return {
        contractorId: r.CONTRATOR_ID,
        contractorName: r.CONTRATOR_NAME,
        keywords,
        // ── regex একবারই বানানো হলো, প্রতি row-এ rebuild করা হবে না (perf fix) ──
        regexes: keywords.map((kw) => new RegExp(`\\b${escapeRegex(kw)}\\b`)),
      };
    })
    .filter((c) => c.keywords.length > 0);
}

// function matchContractor(desc, contractors) {
//   if (!desc) return null;
//   const lower = normalize(desc);
//   for (const c of contractors) { if (lower.includes(c.nameKey)) return c; }
//   return null;
// }

// ── keyword-based scoring match, matchProject এর মতোই লজিক ──
// ── keyword-based scoring match, matchProject এর মতোই লজিক ──
function matchContractor(desc, contractors) {
  if (!desc) return null;
  const descNorm = normalize(desc);
  let best = null,
    bestScore = 0;

  for (const c of contractors) {
    let score = 0;
    for (let i = 0; i < c.regexes.length; i++) {
      if (c.regexes[i].test(descNorm)) score += c.keywords[i].length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return bestScore >= 4 ? best : null;
}
function extractInvoiceNo(desc) {
  if (!desc) return null;
  const match = desc.match(
    /\b(?:Inv|Invoice)\b[\s.]*?(?:No\.?\s*)?[-:#]?\s*(\d+)\b/i,
  );
  return match ? match[1] : null;
}


// ── NEW: split description around "Inv ###" so contractor is matched from the
// text BEFORE it and project is matched from the text AFTER it (client's rule).
// Falls back to whole-string matching (old behavior) when no "Inv" anchor found
// or when the windowed match returns nothing. Does not touch existing matchers.
const INV_ANCHOR_RE = /\b(?:Inv|Invoice)\b[\s.]*?(?:No\.?\s*)?[-:#]?\s*\d+\b/i;
const PROJECT_WINDOW_CHARS = 80;

function matchContractorSmart(desc, contractors) {
  if (!desc) return null;
  const m = desc.match(INV_ANCHOR_RE);
  if (m) {
    const beforeText = desc.slice(0, m.index);
    const smartMatch = matchContractor(beforeText, contractors);
    if (smartMatch) return smartMatch;
  }
  // fallback: old whole-string behavior
  return matchContractor(desc, contractors);
}

function matchProjectSmart(desc, projects) {
  if (!desc) return null;
  const m = desc.match(INV_ANCHOR_RE);
  if (m) {
    const afterStart = m.index + m[0].length;
    const afterText = desc.slice(afterStart, afterStart + PROJECT_WINDOW_CHARS);
    const smartMatch = matchProject(afterText, projects);
    if (smartMatch) return smartMatch;
  }
  // fallback: old whole-string behavior
  return matchProject(desc, projects);
}

function parseAmount(str) {
  return parseFloat(String(str || "0").replace(/,/g, "")) || 0;
}

function parseDate(str) {
  if (!str) return null;
  str = str.trim();
  let match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    const date = new Date(
      `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00`,
    );
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
  if (!val) return "";
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── amount থেকে debit/credit বের করা: positive = debit, negative = credit ──
function deriveDebitCredit(amount) {
  const n = Number(amount) || 0;
  return n >= 0
    ? { debit: n, credit: null }
    : { debit: null, credit: Math.abs(n) };
}

// ── CSV upload: duplicate check শুধু STAGING থেকে ──
export async function processCsvToStaging(csvText, userId) {
  const rows = parseCSV(csvText);
  let dataRows = rows;
  if (
    rows[0] &&
    rows[0].some((c) =>
      /date|amount|debit|credit|description|balance|narration/i.test(c),
    )
  ) {
    dataRows = rows.slice(1);
  }

  const projects = await loadProjectAddresses();
  const contractors = await loadContractors();
  const batchId = Date.now();

  const existingResult = await poolExecute(
    `SELECT TXN_DATE, AMOUNT, DESCRIPTION FROM PM.PM_STATEMENT_STAGING`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const existingKeys = new Set(
    (existingResult.rows || []).map(
      (r) =>
        `${toDateKey(r.TXN_DATE)}|${Number(r.AMOUNT)}|${(r.DESCRIPTION || "").trim().toLowerCase()}`,
    ),
  );

  const processed = [];
  for (const row of dataRows) {
    if (row.length < 3) continue;
    const dateStr = row[0];
    const amountStr = row[1];
    const desc = row[2];
    const balanceStr = row[3] || null;

    const txnDate = parseDate(dateStr);
    const amount = parseAmount(amountStr);

    const key = `${toDateKey(txnDate)}|${Number(amount)}|${(desc || "").trim().toLowerCase()}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);

    // const matchedProject = matchProject(desc, projects);
    // const matchedContractor = matchContractor(desc, contractors);
    const matchedProject = matchProjectSmart(desc, projects);
    const matchedContractor = matchContractorSmart(desc, contractors);
    const category = matchedProject ? "address" : categorize(desc);
    const invoiceNo = extractInvoiceNo(desc);

    processed.push({
      uploadBatchId: batchId,
      pId: matchedProject ? matchedProject.pId : null,
      projectName: matchedProject ? matchedProject.pName : null,
      txnDate,
      amount,
      description: desc || "",
      balance: balanceStr !== null ? parseAmount(balanceStr) : null,
      category,
      matchedAddress: matchedProject ? matchedProject.fullAddress : null,
      contractorId: matchedContractor ? matchedContractor.contractorId : null,
      contractorName: matchedContractor
        ? matchedContractor.contractorName
        : null,
      invoiceNo: invoiceNo || null,
      sourceType: "BANKING",
      remarks: null,
      userId,
    });
  }

  await bulkInsertStaging(processed);

  return { batchId, count: processed.length, skipped: 0 };
}

// ── নতুন হেল্পার: 3000+ row হলেও executeMany দিয়ে chunk-wise bulk insert, ──
// ── আগের মতো প্রতি row-এ আলাদা round-trip/commit করবে না (perf fix) ──
async function bulkInsertStaging(processed) {
  if (processed.length === 0) return;

  const conn = await getConnection();
  try {
    const sql = `INSERT INTO PM.PM_STATEMENT_STAGING
        (UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
         CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
         SOURCE_TYPE, REMARKS, STATUS, USER_ID)
       VALUES
        (:uploadBatchId, :pId, :projectName, :txnDate, :amount, :description, :balance,
         :category, :matchedAddress, :contractorId, :contractorName, :invoiceNo,
         :sourceType, :remarks, 'PENDING', :userId)`;

    const options = {
      autoCommit: true,
      batchErrors: true,
      bindDefs: {
        uploadBatchId: { type: oracledb.NUMBER },
        pId: { type: oracledb.NUMBER },
        projectName: { type: oracledb.STRING, maxSize: 500 },
        txnDate: { type: oracledb.DATE },
        amount: { type: oracledb.NUMBER },
        description: { type: oracledb.STRING, maxSize: 4000 },
        balance: { type: oracledb.NUMBER },
        category: { type: oracledb.STRING, maxSize: 50 },
        matchedAddress: { type: oracledb.STRING, maxSize: 500 },
        contractorId: { type: oracledb.NUMBER },
        contractorName: { type: oracledb.STRING, maxSize: 500 },
        invoiceNo: { type: oracledb.STRING, maxSize: 100 },
        sourceType: { type: oracledb.STRING, maxSize: 20 },
        remarks: { type: oracledb.STRING, maxSize: 500 },
        userId: { type: oracledb.NUMBER },
      },
    };

    const CHUNK = 500;
    for (let i = 0; i < processed.length; i += CHUNK) {
      const batch = processed.slice(i, i + CHUNK);
      const result = await conn.executeMany(sql, batch, options);
      if (result.batchErrors?.length) {
        console.error("Staging bulk insert batchErrors:", result.batchErrors);
      }
    }
  } finally {
    await conn.close();
  }
}

export async function getLatestPendingBatch() {
  const result = await poolExecute(
    `SELECT UPLOAD_BATCH_ID FROM PM.PM_STATEMENT_STAGING
     WHERE STATUS = 'PENDING' ORDER BY CREATION_DATE DESC FETCH FIRST 1 ROWS ONLY`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
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
            s.SOURCE_TYPE, s.REMARKS, s.PAYMENT_BY,s.EXCLUDE_MARGIN, s.STATUS
     FROM PM.PM_STATEMENT_STAGING s
     WHERE s.UPLOAD_BATCH_ID = :batchId
     ORDER BY s.TXN_DATE DESC`,
    { batchId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  return result.rows || [];
}

// ── filters সহ সব staging rows (Banking / Non-banking sub-tab) ──
// ── এখন optional pagination + stats সহ: page/pageSize না দিলে আগের মতোই সব rows রিটার্ন করবে ──
export async function getStagingFiltered(
  filters = {},
  pagination = {},
  sortBy = "txnDate",
) {
  // const { where, binds } = buildStagingWhere(filters);

  // let sql = `SELECT STAGING_ID, UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE,
  //                   AMOUNT, DESCRIPTION, BALANCE, CATEGORY, MATCHED_ADDRESS,
  //                   CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
  //                   INVOICE_FILE_NAME, SOURCE_TYPE, REMARKS, STATUS
  //            FROM PM.PM_STATEMENT_STAGING ${where}
  //            ORDER BY TXN_DATE DESC, STAGING_ID DESC`;
  const { where, binds } = buildStagingWhere(filters);

  // const orderClause =
  //   sortBy === "recent"
  //     ? "CREATION_DATE DESC, STAGING_ID DESC"
  //     : "TXN_DATE DESC, STAGING_ID DESC";
  const orderClause = "TXN_DATE DESC, STAGING_ID DESC";

  let sql = `SELECT STAGING_ID, UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE,
                    AMOUNT, DESCRIPTION, BALANCE, CATEGORY, MATCHED_ADDRESS,
                    CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
                    INVOICE_FILE_NAME, SOURCE_TYPE, REMARKS, PAYMENT_BY,EXCLUDE_MARGIN, STATUS
             FROM PM.PM_STATEMENT_STAGING ${where}
             ORDER BY ${orderClause}`;

  const { page, pageSize } = pagination;
  const isPaginated = Number(page) > 0 && Number(pageSize) > 0;

  if (!isPaginated) {
    const result = await poolExecute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  }

  const offset = (Number(page) - 1) * Number(pageSize);
  const pagedSql = `${sql} OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`;
  const pagedBinds = { ...binds, offset, pageSize: Number(pageSize) };

  const countSql = `SELECT COUNT(*) AS TOTAL FROM PM.PM_STATEMENT_STAGING ${where}`;

  const [dataResult, countResult] = await Promise.all([
    poolExecute(pagedSql, pagedBinds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }),
    poolExecute(countSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
  ]);

  return {
    rows: dataResult.rows || [],
    totalCount: Number(countResult.rows?.[0]?.TOTAL || 0),
  };
}

// ── category breakdown (address/place/product/other counts), same filters minus category itself ──
export async function getStagingStats(filters = {}) {
  const { category, categories, ...rest } = filters; // category filter excluded so stats show full breakdown
  const { where, binds } = buildStagingWhere(rest);

  const sql = `SELECT NVL(CATEGORY, 'other') AS CATEGORY, COUNT(*) AS CNT
               FROM PM.PM_STATEMENT_STAGING ${where}
               GROUP BY CATEGORY`;

  const result = await poolExecute(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });
  const stats = { address: 0, place: 0, product: 0, other: 0 };
  for (const row of result.rows || []) {
    const key = (row.CATEGORY || "other").toLowerCase();
    if (stats[key] !== undefined) stats[key] = Number(row.CNT);
    else stats.other += Number(row.CNT);
  }
  return stats;
}

// ── WHERE clause builder, shared by getStagingFiltered / getStagingStats ──
function buildStagingWhere(filters = {}) {
  let where = "WHERE 1=1";
  const binds = {};

  if (filters.sourceType) {
    where += " AND SOURCE_TYPE = :sourceType";
    binds.sourceType = filters.sourceType;
  }
  if (filters.status) {
    where += " AND STATUS = :status";
    binds.status = filters.status;
  }
  if (filters.dateFrom) {
    where += " AND TXN_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')";
    binds.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo) {
    where += " AND TXN_DATE <= TO_DATE(:dateTo, 'YYYY-MM-DD')";
    binds.dateTo = filters.dateTo;
  }
  if (filters.pId) {
    where += " AND P_ID = :pId";
    binds.pId = filters.pId;
  }
  if (filters.contractorId) {
    where += " AND CONTRACTOR_ID = :contractorId";
    binds.contractorId = filters.contractorId;
  }
  if (filters.invoiceNo) {
    where += " AND UPPER(INVOICE_NO) LIKE UPPER(:invoiceNo)";
    binds.invoiceNo = `%${filters.invoiceNo}%`;
  }
  if (filters.amountMin) {
    where += " AND AMOUNT >= :amountMin";
    binds.amountMin = filters.amountMin;
  }
  if (filters.amountMax) {
    where += " AND AMOUNT <= :amountMax";
    binds.amountMax = filters.amountMax;
  }
    // NEW: exact amount search, sign-agnostic (300 matches both 300 and -300)
  if (filters.amount) {
    where += " AND ABS(AMOUNT) = :amount";
    binds.amount = Math.abs(Number(filters.amount));
  }
  if (filters.description) {
    where += " AND UPPER(DESCRIPTION) LIKE UPPER(:description)";
    binds.description = `%${filters.description}%`;
  }
  if (filters.matchedAddress) {
    where += " AND UPPER(MATCHED_ADDRESS) LIKE UPPER(:matchedAddress)";
    binds.matchedAddress = `%${filters.matchedAddress}%`;
  }

  // ── single category dropdown filter (existing behavior) ──
  if (filters.category) {
    where += " AND CATEGORY = :category";
    binds.category = filters.category;
  }

  // ── NEW: multi-select checkbox filter, e.g. categories=address,place ──
  if (filters.categories) {
    const list = String(filters.categories)
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (list.length > 0) {
      const placeholders = list.map((_, i) => `:cat${i}`).join(",");
      list.forEach((c, i) => {
        binds[`cat${i}`] = c;
      });
      where += ` AND CATEGORY IN (${placeholders})`;
    }
  }

  return { where, binds };
}

// ── category breakdown (address/place/product/other counts), same filters minus category itself ──
// export async function getStagingStats(filters = {}) {
//   const { category, categories, ...rest } = filters; // category filter excluded so stats show full breakdown
//   const { where, binds } = buildStagingWhere(rest);

//   const sql = `SELECT NVL(CATEGORY, 'other') AS CATEGORY, COUNT(*) AS CNT
//                FROM PM.PM_STATEMENT_STAGING ${where}
//                GROUP BY CATEGORY`;

//   const result = await poolExecute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//   const stats = { address: 0, place: 0, product: 0, other: 0 };
//   for (const row of result.rows || []) {
//     const key = (row.CATEGORY || 'other').toLowerCase();
//     if (stats[key] !== undefined) stats[key] = Number(row.CNT);
//     else stats.other += Number(row.CNT);
//   }
//   return stats;
// }

// ── WHERE clause builder, shared by getStagingFiltered / getStagingStats ──
// function buildStagingWhere(filters = {}) {
//   let where = 'WHERE 1=1';
//   const binds = {};

//   if (filters.sourceType) { where += ' AND SOURCE_TYPE = :sourceType'; binds.sourceType = filters.sourceType; }
//   if (filters.status)     { where += ' AND STATUS = :status';         binds.status = filters.status; }
//   if (filters.dateFrom)   { where += ' AND TXN_DATE >= TO_DATE(:dateFrom, \'YYYY-MM-DD\')'; binds.dateFrom = filters.dateFrom; }
//   if (filters.dateTo)     { where += ' AND TXN_DATE <= TO_DATE(:dateTo, \'YYYY-MM-DD\')';   binds.dateTo = filters.dateTo; }
//   if (filters.pId)        { where += ' AND P_ID = :pId'; binds.pId = filters.pId; }
//   if (filters.contractorId) { where += ' AND CONTRACTOR_ID = :contractorId'; binds.contractorId = filters.contractorId; }
//   if (filters.invoiceNo)  { where += ' AND UPPER(INVOICE_NO) LIKE UPPER(:invoiceNo)'; binds.invoiceNo = `%${filters.invoiceNo}%`; }
//   if (filters.amountMin)  { where += ' AND AMOUNT >= :amountMin'; binds.amountMin = filters.amountMin; }
//   if (filters.amountMax)  { where += ' AND AMOUNT <= :amountMax'; binds.amountMax = filters.amountMax; }
//   if (filters.description){ where += ' AND UPPER(DESCRIPTION) LIKE UPPER(:description)'; binds.description = `%${filters.description}%`; }
//   if (filters.matchedAddress) { where += ' AND UPPER(MATCHED_ADDRESS) LIKE UPPER(:matchedAddress)'; binds.matchedAddress = `%${filters.matchedAddress}%`; }

//   // ── single category dropdown filter (existing behavior) ──
//   if (filters.category) { where += ' AND CATEGORY = :category'; binds.category = filters.category; }

//   // ── NEW: multi-select checkbox filter, e.g. categories=address,place ──
//   if (filters.categories) {
//     const list = String(filters.categories).split(',').map((c) => c.trim()).filter(Boolean);
//     if (list.length > 0) {
//       const placeholders = list.map((_, i) => `:cat${i}`).join(',');
//       list.forEach((c, i) => { binds[`cat${i}`] = c; });
//       where += ` AND CATEGORY IN (${placeholders})`;
//     }
//   }

//   return { where, binds };
// }
export async function getAllProjects() {
  const result = await poolExecute(
    `SELECT P_ID, P_NAME FROM PM.PM_PROJECT ORDER BY SORT_ORDER ASC`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  return result.rows || [];
}

export async function getAllContractors() {
  const result = await poolExecute(
    `SELECT CONTRATOR_ID, CONTRATOR_NAME FROM PM.PM_CONTRACTOR_INFO WHERE STATUS = 1 ORDER BY SORT_ORDER ASC`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  return result.rows || [];
}

// ── Approved Records (PM_STATEMENT_MAIN) inline edit — mirrors updateStagingRow but targets TXN_ID ──
export async function updateMainRow(txnId, updates) {
  const fields = [];
  const binds = { txnId };

  if (updates.pId !== undefined) {
    fields.push("P_ID = :pId", "PROJECT_NAME = :projectName");
    binds.pId = updates.pId || null;
    binds.projectName = updates.projectName || null;
  }
  if (updates.contractorId !== undefined) {
    fields.push(
      "CONTRACTOR_ID = :contractorId",
      "CONTRACTOR_NAME = :contractorName",
    );
    binds.contractorId = updates.contractorId || null;
    binds.contractorName = updates.contractorName || null;
  }
  if (updates.invoiceNo !== undefined) {
    fields.push("INVOICE_NO = :invoiceNo");
    binds.invoiceNo = updates.invoiceNo || null;
  }
  if (updates.remarks !== undefined) {
    fields.push("REMARKS = :remarks");
    binds.remarks = updates.remarks || null;
  }
  if (updates.category !== undefined) {
    fields.push("CATEGORY = :category");
    binds.category = updates.category || null;
  }
  if (updates.paymentBy !== undefined) { fields.push('PAYMENT_BY = :paymentBy'); binds.paymentBy = updates.paymentBy || null; }  
  if (updates.excludeMargin !== undefined) { fields.push('EXCLUDE_MARGIN = :excludeMargin'); binds.excludeMargin = updates.excludeMargin || 'N'; }  // ← ADD

  if (fields.length === 0) return { updated: false };

  await poolExecute(
    `UPDATE PM.PM_STATEMENT_MAIN SET ${fields.join(", ")} WHERE TXN_ID = :txnId`,
    binds,
    { autoCommit: true },
  );
  return { updated: true };
}

export async function uploadMainInvoiceFile(txnId, file) {
  await poolExecute(
    `UPDATE PM.PM_STATEMENT_MAIN
     SET INVOICE_FILE = :fileData, INVOICE_FILE_NAME = :fileName,
         INVOICE_FILE_TYPE = :fileType, INVOICE_FILE_SIZE = :fileSize
     WHERE TXN_ID = :txnId`,
    {
      txnId,
      fileData: { val: file.buffer, type: oracledb.BLOB },
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    },
    { autoCommit: true },
  );
  return { uploaded: true };
}

export async function deleteMainInvoiceFile(txnId) {
  await poolExecute(
    `UPDATE PM.PM_STATEMENT_MAIN
     SET INVOICE_FILE = NULL, INVOICE_FILE_NAME = NULL,
         INVOICE_FILE_TYPE = NULL, INVOICE_FILE_SIZE = NULL
     WHERE TXN_ID = :txnId`,
    { txnId },
    { autoCommit: true },
  );
  return { deleted: true };
}

export async function updateStagingRow(stagingId, updates) {
  const fields = [];
  const binds = { stagingId };

  if (updates.pId !== undefined) {
    fields.push("P_ID = :pId", "PROJECT_NAME = :projectName");
    binds.pId = updates.pId || null;
    binds.projectName = updates.projectName || null;
  }
  if (updates.contractorId !== undefined) {
    fields.push(
      "CONTRACTOR_ID = :contractorId",
      "CONTRACTOR_NAME = :contractorName",
    );
    binds.contractorId = updates.contractorId || null;
    binds.contractorName = updates.contractorName || null;
  }
  if (updates.invoiceNo !== undefined) {
    fields.push("INVOICE_NO = :invoiceNo");
    binds.invoiceNo = updates.invoiceNo || null;
  }
  if (updates.remarks !== undefined) {
    fields.push("REMARKS = :remarks");
    binds.remarks = updates.remarks || null;
  }
  if (updates.category !== undefined) {
    fields.push("CATEGORY = :category");
    binds.category = updates.category || null;
  }
   if (updates.paymentBy !== undefined) { fields.push('PAYMENT_BY = :paymentBy'); binds.paymentBy = updates.paymentBy || null; }  
   if (updates.excludeMargin !== undefined) { fields.push('EXCLUDE_MARGIN = :excludeMargin'); binds.excludeMargin = updates.excludeMargin || 'N'; }  // ← ADD


  if (fields.length === 0) return { updated: false };

  await poolExecute(
    `UPDATE PM.PM_STATEMENT_STAGING SET ${fields.join(", ")} WHERE STAGING_ID = :stagingId`,
    binds,
    { autoCommit: true },
  );
  return { updated: true };
}

// ── Rematch a single PENDING staging row using current matching logic ──
// (does not touch APPROVED rows or PM_STATEMENT_MAIN, staging only)
export async function rematchStagingRow(stagingId) {
  const result = await poolExecute(
    `SELECT STAGING_ID, DESCRIPTION, STATUS FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID = :stagingId`,
    { stagingId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const row = result.rows?.[0];
  if (!row) throw new Error("Staging row not found.");
  if (row.STATUS === "APPROVED")
    throw new Error("Approved rows cannot be rematched.");

  const desc = row.DESCRIPTION || "";

  const projects = await loadProjectAddresses();
  const contractors = await loadContractors();

  const matchedProject = matchProjectSmart(desc, projects);
  const matchedContractor = matchContractorSmart(desc, contractors);
  const category = matchedProject ? "address" : categorize(desc);
  const invoiceNo = extractInvoiceNo(desc);

  await poolExecute(
    `UPDATE PM.PM_STATEMENT_STAGING
     SET P_ID = :pId, PROJECT_NAME = :projectName, MATCHED_ADDRESS = :matchedAddress,
         CONTRACTOR_ID = :contractorId, CONTRACTOR_NAME = :contractorName,
         CATEGORY = :category, INVOICE_NO = :invoiceNo
     WHERE STAGING_ID = :stagingId`,
    {
      stagingId,
      pId: matchedProject ? matchedProject.pId : null,
      projectName: matchedProject ? matchedProject.pName : null,
      matchedAddress: matchedProject ? matchedProject.fullAddress : null,
      contractorId: matchedContractor ? matchedContractor.contractorId : null,
      contractorName: matchedContractor ? matchedContractor.contractorName : null,
      category,
      invoiceNo: invoiceNo || null,
    },
    { autoCommit: true },
  );

  return {
    rematched: true,
    pId: matchedProject ? matchedProject.pId : null,
    projectName: matchedProject ? matchedProject.pName : null,
    contractorId: matchedContractor ? matchedContractor.contractorId : null,
    contractorName: matchedContractor ? matchedContractor.contractorName : null,
    category,
    invoiceNo: invoiceNo || null,
  };
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
      fileSize: file.size,
    },
    { autoCommit: true },
  );
  return { uploaded: true };
}

// ── invoice file delete (replace করার আগে user explicit delete করবে) ──
export async function deleteInvoiceFile(stagingId) {
  await poolExecute(
    `UPDATE PM.PM_STATEMENT_STAGING
     SET INVOICE_FILE = NULL, INVOICE_FILE_NAME = NULL,
         INVOICE_FILE_TYPE = NULL, INVOICE_FILE_SIZE = NULL
     WHERE STAGING_ID = :stagingId`,
    { stagingId },
    { autoCommit: true },
  );
  return { deleted: true };
}

// ── Permanently delete a PENDING staging row (Non-banking only, from UI) ──
export async function deleteStagingRow(stagingId) {
  const conn = await getConnection();
  try {
    // guard: don't allow deleting an already-approved row
    const check = await conn.execute(
      `SELECT STATUS FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID = :stagingId`,
      { stagingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = check.rows?.[0];
    if (!row) throw new Error("Staging row not found.");
    if (row.STATUS === "APPROVED")
      throw new Error("Approved rows cannot be deleted.");

    // clean up any multi-invoice files/records parented to this staging row
    const invoiceIdsResult = await conn.execute(
      `SELECT INVOICE_ID FROM PM.PM_STATEMENT_INVOICE
       WHERE PARENT_TYPE = 'STAGING' AND PARENT_ID = :stagingId`,
      { stagingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const invoiceIds = (invoiceIdsResult.rows || []).map((r) => r.INVOICE_ID);

    if (invoiceIds.length > 0) {
      const placeholders = invoiceIds.map((_, i) => `:id${i}`).join(",");
      const binds = {};
      invoiceIds.forEach((id, i) => {
        binds[`id${i}`] = id;
      });

      await conn.execute(
        `DELETE FROM PM.PM_STATEMENT_INVOICE_FILE WHERE INVOICE_ID IN (${placeholders})`,
        binds,
      );
      await conn.execute(
        `DELETE FROM PM.PM_STATEMENT_INVOICE WHERE INVOICE_ID IN (${placeholders})`,
        binds,
      );
    }

    // delete the staging row itself (this also clears its own INVOICE_FILE BLOB column)
    await conn.execute(
      `DELETE FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID = :stagingId`,
      { stagingId },
    );

    await conn.commit();
    return { deleted: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

async function readLobToBuffer(lobOrBuffer) {
  if (!lobOrBuffer) return null;
  if (Buffer.isBuffer(lobOrBuffer)) return lobOrBuffer;
  if (typeof lobOrBuffer.getData === "function")
    return await lobOrBuffer.getData();
  if (typeof lobOrBuffer.on === "function") {
    return await new Promise((resolve, reject) => {
      const chunks = [];
      lobOrBuffer.on("data", (chunk) => chunks.push(chunk));
      lobOrBuffer.on("end", () => resolve(Buffer.concat(chunks)));
      lobOrBuffer.on("error", reject);
    });
  }
  return Buffer.from(lobOrBuffer);
}

export async function getInvoiceFile(stagingId) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE
       FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID = :stagingId`,
      { stagingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = result.rows?.[0];
    if (!row || !row.INVOICE_FILE) return null;
    const buffer = await readLobToBuffer(row.INVOICE_FILE);
    if (!buffer) return null;
    return {
      buffer,
      fileName: row.INVOICE_FILE_NAME,
      fileType: row.INVOICE_FILE_TYPE,
    };
  } finally {
    await conn.close();
  }
}

// ── Approve: staging থেকে DELETE করে না, STATUS = 'APPROVED'; debit/credit derive করে main-এ পাঠায় ──
// export async function approveAndMoveToMain(stagingIds, approvedBy) {
//   if (!Array.isArray(stagingIds) || stagingIds.length === 0) {
//     throw new Error('No rows selected to approve.');
//   }

//   const placeholders = stagingIds.map((_, i) => `:id${i}`).join(',');
//   const binds = {};
//   stagingIds.forEach((id, i) => { binds[`id${i}`] = id; });

//   const conn = await getConnection();
//   try {
//     // ── staging rows read করো যাতে debit/credit derive করতে পারি ──
//     const stagingResult = await conn.execute(
//       `SELECT STAGING_ID, UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
//               CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
//               INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
//               SOURCE_TYPE, REMARKS, USER_ID, ENTRY_TYPE
//        FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID IN (${placeholders})`,
//       binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     for (const row of stagingResult.rows || []) {
//       let debit = null, credit = null;

//       if (row.SOURCE_TYPE === 'NON_BANKING' && row.ENTRY_TYPE) {
//         // non-banking: explicit type অনুযায়ী debit/credit
//         if (row.ENTRY_TYPE === 'DEBIT') debit = Math.abs(Number(row.AMOUNT));
//         else credit = Math.abs(Number(row.AMOUNT));
//       } else {
//         // banking: amount sign অনুযায়ী auto derive
//         const dc = deriveDebitCredit(row.AMOUNT);
//         debit = dc.debit;
//         credit = dc.credit;
//       }

//       await conn.execute(
//         `INSERT INTO PM.PM_STATEMENT_MAIN
//           (UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
//            CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
//            INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
//            SOURCE_TYPE, REMARKS, DEBIT, CREDIT, APPROVED_BY, APPROVED_DATE, USER_ID)
//          VALUES
//           (:uploadBatchId, :pId, :projectName, :txnDate, :amount, :description, :balance,
//            :category, :matchedAddress, :contractorId, :contractorName, :invoiceNo,
//            :invoiceFile, :invoiceFileName, :invoiceFileType, :invoiceFileSize,
//            :sourceType, :remarks, :debit, :credit, :approvedBy, SYSDATE, :userId)`,
//         {
//           uploadBatchId: row.UPLOAD_BATCH_ID, pId: row.P_ID, projectName: row.PROJECT_NAME,
//           txnDate: row.TXN_DATE, amount: row.AMOUNT, description: row.DESCRIPTION, balance: row.BALANCE,
//           category: row.CATEGORY, matchedAddress: row.MATCHED_ADDRESS,
//           contractorId: row.CONTRACTOR_ID, contractorName: row.CONTRACTOR_NAME, invoiceNo: row.INVOICE_NO,
//           invoiceFile: row.INVOICE_FILE ? { val: await readLobToBuffer(row.INVOICE_FILE), type: oracledb.BLOB } : null,
//           invoiceFileName: row.INVOICE_FILE_NAME, invoiceFileType: row.INVOICE_FILE_TYPE, invoiceFileSize: row.INVOICE_FILE_SIZE,
//           sourceType: row.SOURCE_TYPE, remarks: row.REMARKS,
//           debit, credit, approvedBy, userId: row.USER_ID
//         }
//       );
//     }

//     await conn.execute(
//       `UPDATE PM.PM_STATEMENT_STAGING SET STATUS = 'APPROVED' WHERE STAGING_ID IN (${placeholders})`,
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
export async function approveAndMoveToMain(stagingIds, approvedBy) {
  if (!Array.isArray(stagingIds) || stagingIds.length === 0) {
    throw new Error("No rows selected to approve.");
  }

  const placeholders = stagingIds.map((_, i) => `:id${i}`).join(",");
  const binds = {};
  stagingIds.forEach((id, i) => {
    binds[`id${i}`] = id;
  });

  const conn = await getConnection();
  try {
    // const stagingResult = await conn.execute(
    //   `SELECT STAGING_ID, UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
    //           CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
    //           INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
    //           SOURCE_TYPE, REMARKS, USER_ID, ENTRY_TYPE
    //    FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID IN (${placeholders})`,
    //   binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    // );
    const stagingResult = await conn.execute(
      `SELECT STAGING_ID, UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
              CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
              INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
              SOURCE_TYPE, REMARKS, PAYMENT_BY,EXCLUDE_MARGIN, USER_ID, ENTRY_TYPE   -- ← add PAYMENT_BY here
       FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID IN (${placeholders})`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    for (const row of stagingResult.rows || []) {
      let debit = null,
        credit = null;

      if (row.SOURCE_TYPE === "NON_BANKING" && row.ENTRY_TYPE) {
        if (row.ENTRY_TYPE === "DEBIT") debit = Math.abs(Number(row.AMOUNT));
        else credit = Math.abs(Number(row.AMOUNT));
      } else {
        const dc = deriveDebitCredit(row.AMOUNT);
        debit = dc.debit;
        credit = dc.credit;
      }


    //   const insertResult = await conn.execute(
    //     `INSERT INTO PM.PM_STATEMENT_MAIN
    //   (STAGING_ID, UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
    //    CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
    //    INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
    //    SOURCE_TYPE, REMARKS, PAYMENT_BY, DEBIT, CREDIT, APPROVED_BY, APPROVED_DATE, USER_ID)
    //  VALUES
    //   (:stagingId, :uploadBatchId, :pId, :projectName, :txnDate, :amount, :description, :balance,
    //    :category, :matchedAddress, :contractorId, :contractorName, :invoiceNo,
    //    :invoiceFile, :invoiceFileName, :invoiceFileType, :invoiceFileSize,
    //    :sourceType, :remarks, :paymentBy, :debit, :credit, :approvedBy, SYSDATE, :userId)
    //  RETURNING TXN_ID INTO :newTxnId`,
    //     {
    //       stagingId: row.STAGING_ID,
    //       uploadBatchId: row.UPLOAD_BATCH_ID,
    //       pId: row.P_ID,
    //       projectName: row.PROJECT_NAME,
    //       txnDate: row.TXN_DATE,
    //       amount: row.AMOUNT,
    //       description: row.DESCRIPTION,
    //       balance: row.BALANCE,
    //       category: row.CATEGORY,
    //       matchedAddress: row.MATCHED_ADDRESS,
    //       contractorId: row.CONTRACTOR_ID,
    //       contractorName: row.CONTRACTOR_NAME,
    //       invoiceNo: row.INVOICE_NO,
    //       invoiceFile: row.INVOICE_FILE
    //         ? {
    //             val: await readLobToBuffer(row.INVOICE_FILE),
    //             type: oracledb.BLOB,
    //           }
    //         : null,
    //       invoiceFileName: row.INVOICE_FILE_NAME,
    //       invoiceFileType: row.INVOICE_FILE_TYPE,
    //       invoiceFileSize: row.INVOICE_FILE_SIZE,
    //       sourceType: row.SOURCE_TYPE,
    //       remarks: row.REMARKS,
    //       paymentBy: row.PAYMENT_BY,
    //       debit,
    //       credit,
    //       approvedBy,
    //       userId: row.USER_ID,
    //       newTxnId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    //     },
    //   );
    const insertResult = await conn.execute(
  `INSERT INTO PM.PM_STATEMENT_MAIN
    (STAGING_ID, UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
     CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
     INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE, INVOICE_FILE_SIZE,
     SOURCE_TYPE, REMARKS, PAYMENT_BY, EXCLUDE_MARGIN, DEBIT, CREDIT, APPROVED_BY, APPROVED_DATE, USER_ID)
   VALUES
    (:stagingId, :uploadBatchId, :pId, :projectName, :txnDate, :amount, :description, :balance,
     :category, :matchedAddress, :contractorId, :contractorName, :invoiceNo,
     :invoiceFile, :invoiceFileName, :invoiceFileType, :invoiceFileSize,
     :sourceType, :remarks, :paymentBy, :excludeMargin, :debit, :credit, :approvedBy, SYSDATE, :userId)
   RETURNING TXN_ID INTO :newTxnId`,
  {
    stagingId: row.STAGING_ID,
    uploadBatchId: row.UPLOAD_BATCH_ID,
    pId: row.P_ID,
    projectName: row.PROJECT_NAME,
    txnDate: row.TXN_DATE,
    amount: row.AMOUNT,
    description: row.DESCRIPTION,
    balance: row.BALANCE,
    category: row.CATEGORY,
    matchedAddress: row.MATCHED_ADDRESS,
    contractorId: row.CONTRACTOR_ID,
    contractorName: row.CONTRACTOR_NAME,
    invoiceNo: row.INVOICE_NO,
    invoiceFile: row.INVOICE_FILE
      ? { val: await readLobToBuffer(row.INVOICE_FILE), type: oracledb.BLOB }
      : null,
    invoiceFileName: row.INVOICE_FILE_NAME,
    invoiceFileType: row.INVOICE_FILE_TYPE,
    invoiceFileSize: row.INVOICE_FILE_SIZE,
    sourceType: row.SOURCE_TYPE,
    remarks: row.REMARKS,
    paymentBy: row.PAYMENT_BY,
    excludeMargin: row.EXCLUDE_MARGIN || 'N',   // ← ADD
    debit,
    credit,
    approvedBy,
    userId: row.USER_ID,
    newTxnId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
  },
);

      const newTxnId = insertResult.outBinds.newTxnId[0];

      // ── move any multi-invoices linked to this staging row over to the new MAIN row ──
      // await conn.execute(
      //   `UPDATE PM.PM_STATEMENT_INVOICE
      //    SET PARENT_TYPE = 'MAIN', PARENT_ID = :txnId
      //    WHERE PARENT_TYPE = 'STAGING' AND PARENT_ID = :stagingId`,
      //   { txnId: newTxnId, stagingId: row.STAGING_ID }
      // );
    }

    await conn.execute(
      `UPDATE PM.PM_STATEMENT_STAGING SET STATUS = 'APPROVED' WHERE STAGING_ID IN (${placeholders})`,
      binds,
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

// ── Non-banking manual entry: entryType (DEBIT/CREDIT) + category সহ ──
// export async function insertNonBankingEntry(data, userId) {
//   const batchId = Date.now();
//   const {
//     txnDate, amount, description, pId, projectName,
//     contractorId, contractorName, invoiceNo, remarks, entryType, category
//   } = data;

//   if (!['DEBIT', 'CREDIT'].includes(entryType)) {
//     throw new Error('entryType must be DEBIT or CREDIT.');
//   }

//   const rawAmount = Math.abs(parseAmount(String(amount)));
//   // স্টোর করার সময়: DEBIT positive, CREDIT negative (যেন approve-এর সময় derive logic আগের মতই কাজ করে main-এ)
//   const storedAmount = entryType === 'DEBIT' ? rawAmount : -rawAmount;

//   await poolExecute(
//     `INSERT INTO PM.PM_STATEMENT_STAGING
//       (UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
//        CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
//        SOURCE_TYPE, REMARKS, ENTRY_TYPE, STATUS, USER_ID)
//      VALUES
//       (:uploadBatchId, :pId, :projectName, :txnDate, :amount, :description, NULL,
//        :category, NULL, :contractorId, :contractorName, :invoiceNo,
//        'NON_BANKING', :remarks, :entryType, 'PENDING', :userId)`,
//     {
//       uploadBatchId: batchId,
//       pId: pId || null,
//       projectName: projectName || null,
//       txnDate: txnDate ? new Date(txnDate) : null,
//       amount: storedAmount,
//       description: description || '',
//       category: category || 'other',
//       contractorId: contractorId || null,
//       contractorName: contractorName || null,
//       invoiceNo: invoiceNo || null,
//       remarks: remarks || null,
//       entryType,
//       userId
//     }, { autoCommit: true }
//   );

//   return { batchId };
// }
export async function insertNonBankingEntry(data, userId) {
  const batchId = Date.now();
  const {
    txnDate,
    amount,
    description,
    pId,
    projectName,
    contractorId,
    contractorName,
    invoiceNo,
    remarks,
    entryType,
    category,
    paymentBy, // NEW: 'CUSTOMER' | 'BUILDER'
    excludeMargin, 
  } = data;

  if (!["DEBIT", "CREDIT"].includes(entryType)) {
    throw new Error("entryType must be DEBIT or CREDIT.");
  }

  const rawAmount = Math.abs(parseAmount(String(amount)));
  const storedAmount = entryType === "DEBIT" ? rawAmount : -rawAmount;

  await poolExecute(
    `INSERT INTO PM.PM_STATEMENT_STAGING
      (UPLOAD_BATCH_ID, P_ID, PROJECT_NAME, TXN_DATE, AMOUNT, DESCRIPTION, BALANCE,
       CATEGORY, MATCHED_ADDRESS, CONTRACTOR_ID, CONTRACTOR_NAME, INVOICE_NO,
       SOURCE_TYPE, REMARKS, ENTRY_TYPE, PAYMENT_BY,EXCLUDE_MARGIN, STATUS, USER_ID)
     VALUES
      (:uploadBatchId, :pId, :projectName, :txnDate, :amount, :description, NULL,
       :category, NULL, :contractorId, :contractorName, :invoiceNo,
       'NON_BANKING', :remarks, :entryType, :paymentBy,:excludeMargin, 'PENDING', :userId)`,
    {
      uploadBatchId: batchId,
      pId: pId || null,
      projectName: projectName || null,
      txnDate: txnDate ? new Date(txnDate) : null,
      amount: storedAmount,
      description: description || "",
      category: category || "other",
      contractorId: contractorId || null,
      contractorName: contractorName || null,
      invoiceNo: invoiceNo || null,
      remarks: remarks || null,
      entryType,
      paymentBy: paymentBy || null,
      excludeMargin: excludeMargin || 'N', 
      userId,
    },
    { autoCommit: true },
  );

  return { batchId };
}

// export async function getMainTransactions(filters = {}) {
//   let sql = `SELECT m.TXN_ID, m.UPLOAD_BATCH_ID, m.P_ID, m.PROJECT_NAME, m.TXN_DATE,m.DESCRIPTION,
//                     m.AMOUNT, m.DEBIT, m.CREDIT, m.BALANCE, m.CATEGORY, m.MATCHED_ADDRESS,
//                     m.CONTRACTOR_ID, m.CONTRACTOR_NAME, m.INVOICE_NO,
//                     m.INVOICE_FILE_NAME, m.INVOICE_FILE_TYPE, m.INVOICE_FILE_SIZE,
//                     m.SOURCE_TYPE, m.REMARKS, m.APPROVED_DATE
//              FROM PM.PM_STATEMENT_MAIN m WHERE 1=1`;
//   const binds = {};

//   if (filters.pId)         { sql += ' AND m.P_ID = :pId';           binds.pId = filters.pId; }
//   if (filters.category)    { sql += ' AND m.CATEGORY = :category';  binds.category = filters.category; }
//   if (filters.sourceType)  { sql += ' AND m.SOURCE_TYPE = :sourceType'; binds.sourceType = filters.sourceType; }
//   if (filters.dateFrom)    { sql += ' AND m.TXN_DATE >= TO_DATE(:dateFrom, \'YYYY-MM-DD\')'; binds.dateFrom = filters.dateFrom; }
//   if (filters.dateTo)      { sql += ' AND m.TXN_DATE <= TO_DATE(:dateTo, \'YYYY-MM-DD\')';   binds.dateTo = filters.dateTo; }
//   if (filters.contractorId){ sql += ' AND m.CONTRACTOR_ID = :contractorId'; binds.contractorId = filters.contractorId; }
//   if (filters.invoiceNo)   { sql += ' AND UPPER(m.INVOICE_NO) LIKE UPPER(:invoiceNo)'; binds.invoiceNo = `%${filters.invoiceNo}%`; }
//   // ── amount exact match এর বদলে range ──
//   if (filters.amountMin)   { sql += ' AND m.AMOUNT >= :amountMin'; binds.amountMin = filters.amountMin; }
//   if (filters.amountMax)   { sql += ' AND m.AMOUNT <= :amountMax'; binds.amountMax = filters.amountMax; }
//   if (filters.description) { sql += ' AND UPPER(m.DESCRIPTION) LIKE UPPER(:description)'; binds.description = `%${filters.description}%`; }
//   // ── নতুন: matched address filter ──
//   if (filters.matchedAddress) { sql += ' AND UPPER(m.MATCHED_ADDRESS) LIKE UPPER(:matchedAddress)'; binds.matchedAddress = `%${filters.matchedAddress}%`; }

//   sql += ' ORDER BY m.TXN_DATE DESC';
//   const result = await poolExecute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
//   return result.rows || [];
// }

export async function getMainTransactions(filters = {}, pagination = {}) {
  const { where, binds } = buildMainWhere(filters);

  let sql = `SELECT m.TXN_ID, m.STAGING_ID, m.UPLOAD_BATCH_ID, m.P_ID, m.PROJECT_NAME, m.TXN_DATE, m.DESCRIPTION,
                    m.AMOUNT, m.DEBIT, m.CREDIT, m.BALANCE, m.CATEGORY, m.MATCHED_ADDRESS,
                    m.CONTRACTOR_ID, m.CONTRACTOR_NAME, m.INVOICE_NO,
                    m.INVOICE_FILE_NAME, m.INVOICE_FILE_TYPE, m.INVOICE_FILE_SIZE,
                    m.SOURCE_TYPE, m.REMARKS, m.PAYMENT_BY,m.EXCLUDE_MARGIN, m.APPROVED_DATE 
             FROM PM.PM_STATEMENT_MAIN m ${where}
             ORDER BY m.TXN_DATE DESC, m.TXN_ID DESC`;

  const { page, pageSize } = pagination;
  const isPaginated = Number(page) > 0 && Number(pageSize) > 0;

  if (!isPaginated) {
    const result = await poolExecute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  }

  const offset = (Number(page) - 1) * Number(pageSize);
  const pagedSql = `${sql} OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`;
  const pagedBinds = { ...binds, offset, pageSize: Number(pageSize) };

  const countSql = `SELECT COUNT(*) AS TOTAL FROM PM.PM_STATEMENT_MAIN m ${where}`;

  const [dataResult, countResult] = await Promise.all([
    poolExecute(pagedSql, pagedBinds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }),
    poolExecute(countSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
  ]);

  return {
    rows: dataResult.rows || [],
    totalCount: Number(countResult.rows?.[0]?.TOTAL || 0),
  };
}

function buildMainWhere(filters = {}) {
  let where = "WHERE 1=1";
  const binds = {};

  if (filters.pId) {
    where += " AND m.P_ID = :pId";
    binds.pId = filters.pId;
  }
  if (filters.category) {
    where += " AND m.CATEGORY = :category";
    binds.category = filters.category;
  }
  if (filters.sourceType) {
    where += " AND m.SOURCE_TYPE = :sourceType";
    binds.sourceType = filters.sourceType;
  }
  if (filters.dateFrom) {
    where += " AND m.TXN_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')";
    binds.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo) {
    where += " AND m.TXN_DATE <= TO_DATE(:dateTo, 'YYYY-MM-DD')";
    binds.dateTo = filters.dateTo;
  }
  if (filters.contractorId) {
    where += " AND m.CONTRACTOR_ID = :contractorId";
    binds.contractorId = filters.contractorId;
  }
  if (filters.invoiceNo) {
    where += " AND UPPER(m.INVOICE_NO) LIKE UPPER(:invoiceNo)";
    binds.invoiceNo = `%${filters.invoiceNo}%`;
  }
  if (filters.amountMin) {
    where += " AND m.AMOUNT >= :amountMin";
    binds.amountMin = filters.amountMin;
  }
  if (filters.amountMax) {
    where += " AND m.AMOUNT <= :amountMax";
    binds.amountMax = filters.amountMax;
  }
  // NEW: exact amount search, sign-agnostic
  if (filters.amount) {
    where += " AND ABS(m.AMOUNT) = :amount";
    binds.amount = Math.abs(Number(filters.amount));
  }
  if (filters.description) {
    where += " AND UPPER(m.DESCRIPTION) LIKE UPPER(:description)";
    binds.description = `%${filters.description}%`;
  }
  if (filters.matchedAddress) {
    where += " AND UPPER(m.MATCHED_ADDRESS) LIKE UPPER(:matchedAddress)";
    binds.matchedAddress = `%${filters.matchedAddress}%`;
  }

  return { where, binds };
}
export async function getMainInvoiceFile(txnId) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT INVOICE_FILE, INVOICE_FILE_NAME, INVOICE_FILE_TYPE
       FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :txnId`,
      { txnId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = result.rows?.[0];
    if (!row || !row.INVOICE_FILE) return null;
    const buffer = await readLobToBuffer(row.INVOICE_FILE);
    if (!buffer) return null;
    return {
      buffer,
      fileName: row.INVOICE_FILE_NAME,
      fileType: row.INVOICE_FILE_TYPE,
    };
  } finally {
    await conn.close();
  }
}

// export async function getProjectReport(pId) {
//   const result = await poolExecute(
//     `SELECT m.TXN_ID, m.TXN_DATE, m.AMOUNT, m.DEBIT, m.CREDIT, m.DESCRIPTION,
//             m.CATEGORY, m.MATCHED_ADDRESS, m.CONTRACTOR_NAME, m.INVOICE_NO,
//             m.INVOICE_FILE_NAME, m.SOURCE_TYPE, m.REMARKS, m.APPROVED_DATE,
//             p.P_NAME, p.P_ADDRESS, p.SUBWRB, p.POSTCODE, p.STATE
//      FROM PM.PM_STATEMENT_MAIN m
//      JOIN PM.PM_PROJECT p ON p.P_ID = m.P_ID
//      WHERE m.P_ID = :pId
//      ORDER BY m.TXN_DATE DESC`,
//     { pId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   return result.rows || [];
// }

// export async function getProjectReport(pId) {
//   const result = await poolExecute(
//     `SELECT m.TXN_ID, m.TXN_DATE, m.AMOUNT, m.DEBIT, m.CREDIT, m.DESCRIPTION,
//             m.CATEGORY, m.MATCHED_ADDRESS, m.CONTRACTOR_NAME, m.INVOICE_NO,
//             m.INVOICE_FILE_NAME, m.SOURCE_TYPE, m.REMARKS, m.APPROVED_DATE,
//             p.P_ID, p.P_NAME, p.P_ADDRESS, p.SUBWRB, p.POSTCODE, p.STATE
//      FROM PM.PM_STATEMENT_MAIN m
//      JOIN PM.PM_PROJECT p ON p.P_ID = m.P_ID
//      LEFT JOIN PM.PM_CONTRACTOR_INFO ci ON ci.CONTRATOR_ID = m.CONTRACTOR_ID
//      WHERE m.P_ID = :pId
//      ORDER BY ci.SORT_ORDER, m.TXN_DATE DESC`,
//     { pId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const transactions = result.rows || [];

//   // ── NEW: worker attendance/cost rows for this project ──
//   const workerLogs = await getWorkerCostsByProject(pId);

//   const workerTotals = workerLogs.reduce(
//     (acc, r) => {
//       acc.totalHours += Number(r.HOURS_WORKED) || 0;
//       acc.totalDays  += Number(r.DAYS_WORKED)  || 0;
//       acc.totalAmount += Number(r.AMOUNT) || 0;
//       return acc;
//     },
//     { totalHours: 0, totalDays: 0, totalAmount: 0 }
//   );

//   return { transactions, workerLogs, workerTotals };
// }
// export async function getProjectReport(pId) {
//   const result = await poolExecute(
//     `SELECT m.TXN_ID, m.TXN_DATE, m.AMOUNT, m.DEBIT, m.CREDIT, m.DESCRIPTION,
//             m.CONTRACTOR_ID, m.CONTRACTOR_NAME, m.INVOICE_NO,
//             m.INVOICE_FILE_NAME, m.SOURCE_TYPE, m.REMARKS, m.PAYMENT_BY, m.APPROVED_DATE,
//             p.P_ID, p.P_NAME, p.P_ADDRESS, p.SUBWRB, p.POSTCODE, p.STATE
//      FROM PM.PM_STATEMENT_MAIN m
//      JOIN PM.PM_PROJECT p ON p.P_ID = m.P_ID
//      LEFT JOIN PM.PM_CONTRACTOR_INFO ci ON ci.CONTRATOR_ID = m.CONTRACTOR_ID
//      WHERE m.P_ID = :pId
//      ORDER BY ci.SORT_ORDER, m.TXN_DATE DESC`,
//     { pId },
//     { outFormat: oracledb.OUT_FORMAT_OBJECT },
//   );
//   const transactions = result.rows || [];

//   const workerLogs = await getWorkerCostsByProject(pId);

//   const workerTotals = workerLogs.reduce(
//     (acc, r) => {
//       acc.totalHours += Number(r.HOURS_WORKED) || 0;
//       acc.totalDays += Number(r.DAYS_WORKED) || 0;
//       acc.totalAmount += Number(r.AMOUNT) || 0;
//       return acc;
//     },
//     { totalHours: 0, totalDays: 0, totalAmount: 0 },
//   );

//   return { transactions, workerLogs, workerTotals };
// }


export async function getProjectReport(pId) {
  const result = await poolExecute(
    `SELECT m.TXN_ID, m.TXN_DATE, m.AMOUNT, m.DEBIT, m.CREDIT, m.DESCRIPTION,
            m.CONTRACTOR_ID, m.CONTRACTOR_NAME, m.INVOICE_NO,
            m.INVOICE_FILE_NAME, m.SOURCE_TYPE, m.REMARKS, m.PAYMENT_BY,m.EXCLUDE_MARGIN, m.APPROVED_DATE,
            p.P_ID, p.P_NAME, p.P_ADDRESS, p.SUBWRB, p.POSTCODE, p.STATE, p.MARGIN_PERCENT
     FROM PM.PM_STATEMENT_MAIN m
     JOIN PM.PM_PROJECT p ON p.P_ID = m.P_ID
     LEFT JOIN PM.PM_CONTRACTOR_INFO ci ON ci.CONTRATOR_ID = m.CONTRACTOR_ID
     WHERE m.P_ID = :pId
     ORDER BY ci.SORT_ORDER, m.TXN_DATE DESC`,
    { pId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const transactions = result.rows || [];

  const workerLogs = await getWorkerCostsByProject(pId);

  const workerTotals = workerLogs.reduce(
    (acc, r) => {
      acc.totalHours += Number(r.HOURS_WORKED) || 0;
      acc.totalDays += Number(r.DAYS_WORKED) || 0;
      acc.totalAmount += Number(r.AMOUNT) || 0;
      return acc;
    },
    { totalHours: 0, totalDays: 0, totalAmount: 0 },
  );

  const marginPercent = transactions.length > 0 ? transactions[0].MARGIN_PERCENT : null;

  return { transactions, workerLogs, workerTotals, marginPercent };
}

export async function disapproveTransaction(txnId) {
  const conn = await getConnection();
  try {
    // Get the STAGING_ID from MAIN
    const mainResult = await conn.execute(
      `SELECT STAGING_ID FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :txnId`,
      { txnId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const row = mainResult.rows?.[0];
    if (!row) {
      throw new Error("Transaction not found.");
    }

    const stagingId = row.STAGING_ID;
    if (!stagingId) {
      throw new Error("This is a legacy record and cannot be disapproved.");
    }

    // Delete from MAIN
    await conn.execute(
      `DELETE FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :txnId`,
      { txnId },
    );

    // Update STAGING back to PENDING
    await conn.execute(
      `UPDATE PM.PM_STATEMENT_STAGING SET STATUS = 'PENDING' WHERE STAGING_ID = :stagingId`,
      { stagingId },
    );

    await conn.commit();
    return { disapproved: true, stagingId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// ── Multi-invoice support (PM_STATEMENT_INVOICE + PM_STATEMENT_INVOICE_FILE) ──

// list invoices (with their files) for a given row

// export async function getInvoicesForParent(parentType, parentId) {
//   let effectiveType = parentType;
//   let effectiveId = parentId;

//   if (parentType === 'MAIN') {
//     const mainResult = await poolExecute(
//       `SELECT STAGING_ID FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :txnId`,
//       { txnId: parentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const stagingId = mainResult.rows?.[0]?.STAGING_ID;
//     // legacy MAIN rows with no STAGING_ID keep their invoices parented to MAIN
//     if (stagingId) {
//       effectiveType = 'STAGING';
//       effectiveId = stagingId;
//     }
//   }

//   const invoicesResult = await poolExecute(
//     `SELECT INVOICE_ID, PARENT_TYPE, PARENT_ID, INVOICE_NO, CREATION_DATE
//      FROM PM.PM_STATEMENT_INVOICE
//      WHERE PARENT_TYPE = :parentType AND PARENT_ID = :parentId
//      ORDER BY CREATION_DATE DESC`,
//     { parentType: effectiveType, parentId: effectiveId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const invoices = invoicesResult.rows || [];
//   if (invoices.length === 0) return [];

//   const invoiceIds = invoices.map((inv) => inv.INVOICE_ID);
//   const placeholders = invoiceIds.map((_, i) => `:id${i}`).join(',');
//   const binds = {};
//   invoiceIds.forEach((id, i) => { binds[`id${i}`] = id; });

//   const filesResult = await poolExecute(
//     `SELECT FILE_ID, INVOICE_ID, FILE_NAME, FILE_TYPE, FILE_SIZE, CREATION_DATE
//      FROM PM.PM_STATEMENT_INVOICE_FILE
//      WHERE INVOICE_ID IN (${placeholders})
//      ORDER BY CREATION_DATE ASC`,
//     binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   );
//   const files = filesResult.rows || [];

//   return invoices.map((inv) => ({
//     ...inv,
//     files: files.filter((f) => f.INVOICE_ID === inv.INVOICE_ID),
//   }));
// }
export async function getInvoicesForParent(parentType, parentId) {
  let effectiveType = parentType;
  let effectiveId = parentId;

  if (parentType === "MAIN") {
    const mainResult = await poolExecute(
      `SELECT STAGING_ID FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :txnId`,
      { txnId: parentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const stagingId = mainResult.rows?.[0]?.STAGING_ID;
    // legacy MAIN rows with no STAGING_ID keep their invoices parented to MAIN
    if (stagingId) {
      effectiveType = "STAGING";
      effectiveId = stagingId;
    }
  }

  const invoicesResult = await poolExecute(
    `SELECT i.INVOICE_ID, i.PARENT_TYPE, i.PARENT_ID, i.INVOICE_NO, i.CREATION_DATE,
            i.CREATED_BY, cu.USERNAME AS CREATED_BY_NAME
     FROM PM.PM_STATEMENT_INVOICE i
     LEFT JOIN PM.USERS cu ON cu.ID = i.CREATED_BY
     WHERE i.PARENT_TYPE = :parentType AND i.PARENT_ID = :parentId
     ORDER BY i.CREATION_DATE DESC`,
    { parentType: effectiveType, parentId: effectiveId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const invoices = invoicesResult.rows || [];
  if (invoices.length === 0) return [];

  const invoiceIds = invoices.map((inv) => inv.INVOICE_ID);
  const placeholders = invoiceIds.map((_, i) => `:id${i}`).join(",");
  const binds = {};
  invoiceIds.forEach((id, i) => {
    binds[`id${i}`] = id;
  });

  const filesResult = await poolExecute(
    `SELECT f.FILE_ID, f.INVOICE_ID, f.FILE_NAME, f.FILE_TYPE, f.FILE_SIZE, f.CREATION_DATE,
            f.UPLOADED_BY, uu.USERNAME AS UPLOADED_BY_NAME
     FROM PM.PM_STATEMENT_INVOICE_FILE f
     LEFT JOIN PM.USERS uu ON uu.ID = f.UPLOADED_BY
     WHERE f.INVOICE_ID IN (${placeholders})
     ORDER BY f.CREATION_DATE ASC`,
    binds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const files = filesResult.rows || [];

  return invoices.map((inv) => ({
    ...inv,
    files: files.filter((f) => f.INVOICE_ID === inv.INVOICE_ID),
  }));
}
// create a new invoice (with invoice no) + its files, in one go

// export async function addInvoiceForParent(parentType, parentId, invoiceNo, filesArray, userId) {
//   let effectiveType = parentType;
//   let effectiveId = parentId;

//   if (parentType === 'MAIN') {
//     const mainResult = await poolExecute(
//       `SELECT STAGING_ID FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :txnId`,
//       { txnId: parentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
//     const stagingId = mainResult.rows?.[0]?.STAGING_ID;
//     if (stagingId) {
//       effectiveType = 'STAGING';
//       effectiveId = stagingId;
//     }
//   }

//   const conn = await getConnection();
//   try {
//     const insertResult = await conn.execute(
//       `INSERT INTO PM.PM_STATEMENT_INVOICE (PARENT_TYPE, PARENT_ID, INVOICE_NO)
//        VALUES (:parentType, :parentId, :invoiceNo)
//        RETURNING INVOICE_ID INTO :newInvoiceId`,
//       {
//         parentType: effectiveType, parentId: effectiveId, invoiceNo: invoiceNo || null,
//         newInvoiceId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
//       }
//     );
//     const invoiceId = insertResult.outBinds.newInvoiceId[0];

//     for (const file of filesArray) {
//       await conn.execute(
//         `INSERT INTO PM.PM_STATEMENT_INVOICE_FILE
//           (INVOICE_ID, FILE_DATA, FILE_NAME, FILE_TYPE, FILE_SIZE)
//          VALUES (:invoiceId, :fileData, :fileName, :fileType, :fileSize)`,
//         {
//           invoiceId,
//           fileData: { val: file.buffer, type: oracledb.BLOB },
//           fileName: file.originalname,
//           fileType: file.mimetype,
//           fileSize: file.size,
//         }
//       );
//     }

//     await conn.commit();
//     return { invoiceId, filesAdded: filesArray.length };
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     await conn.close();
//   }
// }

export async function addInvoiceForParent(
  parentType,
  parentId,
  invoiceNo,
  filesArray,
  userId,
) {
  let effectiveType = parentType;
  let effectiveId = parentId;

  if (parentType === "MAIN") {
    const mainResult = await poolExecute(
      `SELECT STAGING_ID FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :txnId`,
      { txnId: parentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const stagingId = mainResult.rows?.[0]?.STAGING_ID;
    if (stagingId) {
      effectiveType = "STAGING";
      effectiveId = stagingId;
    }
  }

  const conn = await getConnection();
  try {
    const insertResult = await conn.execute(
      `INSERT INTO PM.PM_STATEMENT_INVOICE (PARENT_TYPE, PARENT_ID, INVOICE_NO, CREATED_BY)
       VALUES (:parentType, :parentId, :invoiceNo, :userId)
       RETURNING INVOICE_ID INTO :newInvoiceId`,
      {
        parentType: effectiveType,
        parentId: effectiveId,
        invoiceNo: invoiceNo || null,
        userId: userId || null,
        newInvoiceId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
    );
    const invoiceId = insertResult.outBinds.newInvoiceId[0];

    for (const file of filesArray) {
      await conn.execute(
        `INSERT INTO PM.PM_STATEMENT_INVOICE_FILE
          (INVOICE_ID, FILE_DATA, FILE_NAME, FILE_TYPE, FILE_SIZE, UPLOADED_BY)
         VALUES (:invoiceId, :fileData, :fileName, :fileType, :fileSize, :userId)`,
        {
          invoiceId,
          fileData: { val: file.buffer, type: oracledb.BLOB },
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          userId: userId || null,
        },
      );
    }

    await conn.commit();
    return { invoiceId, filesAdded: filesArray.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// add more files to an existing invoice
// export async function addFileToInvoice(invoiceId, file) {
//   await poolExecute(
//     `INSERT INTO PM.PM_STATEMENT_INVOICE_FILE
//       (INVOICE_ID, FILE_DATA, FILE_NAME, FILE_TYPE, FILE_SIZE)
//      VALUES (:invoiceId, :fileData, :fileName, :fileType, :fileSize)`,
//     {
//       invoiceId,
//       fileData: { val: file.buffer, type: oracledb.BLOB },
//       fileName: file.originalname,
//       fileType: file.mimetype,
//       fileSize: file.size,
//     }, { autoCommit: true }
//   );
//   return { uploaded: true };
// }
export async function addFileToInvoice(invoiceId, file, userId) {
  await poolExecute(
    `INSERT INTO PM.PM_STATEMENT_INVOICE_FILE
      (INVOICE_ID, FILE_DATA, FILE_NAME, FILE_TYPE, FILE_SIZE, UPLOADED_BY)
     VALUES (:invoiceId, :fileData, :fileName, :fileType, :fileSize, :userId)`,
    {
      invoiceId,
      fileData: { val: file.buffer, type: oracledb.BLOB },
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      userId: userId || null,
    },
    { autoCommit: true },
  );
  return { uploaded: true };
}

// delete a single file
export async function deleteInvoiceFileRow(fileId) {
  await poolExecute(
    `DELETE FROM PM.PM_STATEMENT_INVOICE_FILE WHERE FILE_ID = :fileId`,
    { fileId },
    { autoCommit: true },
  );
  return { deleted: true };
}

// delete an entire invoice (and its files)
export async function deleteInvoice(invoiceId) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `DELETE FROM PM.PM_STATEMENT_INVOICE_FILE WHERE INVOICE_ID = :invoiceId`,
      { invoiceId },
    );
    await conn.execute(
      `DELETE FROM PM.PM_STATEMENT_INVOICE WHERE INVOICE_ID = :invoiceId`,
      { invoiceId },
    );
    await conn.commit();
    return { deleted: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// get a single file's binary content
export async function getInvoiceFileById(fileId) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT FILE_DATA, FILE_NAME, FILE_TYPE
       FROM PM.PM_STATEMENT_INVOICE_FILE WHERE FILE_ID = :fileId`,
      { fileId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = result.rows?.[0];
    if (!row || !row.FILE_DATA) return null;
    const buffer = await readLobToBuffer(row.FILE_DATA);
    if (!buffer) return null;
    return { buffer, fileName: row.FILE_NAME, fileType: row.FILE_TYPE };
  } finally {
    await conn.close();
  }
}

export async function getTransactionById(parentType, parentId) {
  const type = String(parentType).toUpperCase();

  if (type === "STAGING") {
    const result = await poolExecute(
      `SELECT STAGING_ID, TXN_DATE, AMOUNT, DESCRIPTION
       FROM PM.PM_STATEMENT_STAGING WHERE STAGING_ID = :id`,
      { id: parentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows?.[0] || null;
  }

  if (type === "MAIN") {
    const result = await poolExecute(
      `SELECT TXN_ID, TXN_DATE, AMOUNT, DESCRIPTION
       FROM PM.PM_STATEMENT_MAIN WHERE TXN_ID = :id`,
      { id: parentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows?.[0] || null;
  }

  return null;
}
