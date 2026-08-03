// src\modules\worker-attendance\report.service.js

import oracledb from "oracledb";
import ExcelJS from "exceljs";
import puppeteer from "puppeteer";
import { getConnection } from "../../config/db.js";

export async function getDailyMoneyReport(filters) {
  const connection = await getConnection();
  try {
    const whereClauses = [
      "TRUNC(a.ATTENDANCE_DATE) BETWEEN TRUNC(:from_date) AND TRUNC(:to_date)",
    ];
    const binds = {
      from_date: new Date(filters.FROM_DATE),
      to_date: new Date(filters.TO_DATE),
    };

    if (filters.WORKER_ID) {
      whereClauses.push("a.WORKER_ID = :worker_id");
      binds.worker_id = Number(filters.WORKER_ID);
    }
    if (filters.PROJECT_ID) {
      whereClauses.push("a.PROJECT_ID = :project_id");
      binds.project_id = Number(filters.PROJECT_ID);
    }

    const whereStr = whereClauses.join(" AND ");

    const detailSql = `
      SELECT
        a.ATTENDANCE_ID,
        a.WORKER_ID,
        w.WORKER_NAME,
        a.PROJECT_ID,
        TO_CHAR(a.ATTENDANCE_DATE, 'YYYY-MM-DD') AS ATTENDANCE_DATE,
        a.HOURS_WORKED,
r.RATE_PER_HOUR,
a.HOURS_WORKED * NVL(r.RATE_PER_HOUR, 0) AS AMOUNT
      FROM PM.PM_WORKER_ATTENDANCE a
      JOIN PM.PM_WORKER w ON w.WORKER_ID = a.WORKER_ID
      LEFT JOIN PM.PM_WORKER_RATE_HISTORY r
        ON a.WORKER_ID = r.WORKER_ID
        AND a.ATTENDANCE_DATE BETWEEN r.EFFECTIVE_FROM AND NVL(r.EFFECTIVE_TO, a.ATTENDANCE_DATE)
      WHERE ${whereStr}
      ORDER BY a.ATTENDANCE_DATE ASC, a.WORKER_ID ASC
    `;

    const detailRes = await connection.execute(detailSql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    const rows = detailRes.rows || [];

    // Aggregated here in JS rather than a second/third round trip — a date-range
    // attendance report is a small enough result set that this is simpler than
    // GROUP BY ROLLUP and easier to reason about.
    const dailyMap = new Map();
    const workerMap = new Map();
    let grandTotal = 0;

    for (const r of rows) {
      const amt = Number(r.AMOUNT || 0);
      grandTotal += amt;

      const d = dailyMap.get(r.ATTENDANCE_DATE) || {
        ATTENDANCE_DATE: r.ATTENDANCE_DATE,
        TOTAL_AMOUNT: 0,
      };
      d.TOTAL_AMOUNT += amt;
      dailyMap.set(r.ATTENDANCE_DATE, d);

      const w = workerMap.get(r.WORKER_ID) || {
        WORKER_ID: r.WORKER_ID,
        WORKER_NAME: r.WORKER_NAME,
        TOTAL_AMOUNT: 0,
      };
      w.TOTAL_AMOUNT += amt;
      workerMap.set(r.WORKER_ID, w);
    }

    const round2 = (n) => Math.round(n * 100) / 100;

    return {
      details: rows,
      dailyTotals: [...dailyMap.values()].map((d) => ({
        ...d,
        TOTAL_AMOUNT: round2(d.TOTAL_AMOUNT),
      })),
      workerTotals: [...workerMap.values()].map((w) => ({
        ...w,
        TOTAL_AMOUNT: round2(w.TOTAL_AMOUNT),
      })),
      grandTotal: round2(grandTotal),
    };
  } finally {
    await connection.close();
  }
}

export function generateCsvExport(reportData) {
  const { details, dailyTotals, workerTotals, grandTotal } = reportData;

  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  let csv = 'WORKER_NAME,ATTENDANCE_DATE,HOURS_WORKED,AMOUNT\n';
for (const r of details) {
  csv += [
    escape(r.WORKER_NAME),
    escape(r.ATTENDANCE_DATE),
    escape(r.HOURS_WORKED),
    escape(r.AMOUNT)
  ].join(',') + '\n';
}

  csv += "\nATTENDANCE_DATE,TOTAL_AMOUNT\n";
  for (const r of dailyTotals) {
    csv += [escape(r.ATTENDANCE_DATE), escape(r.TOTAL_AMOUNT)].join(",") + "\n";
  }

  csv += "\nWORKER_NAME,TOTAL_AMOUNT\n";
  for (const r of workerTotals) {
    csv += [escape(r.WORKER_NAME), escape(r.TOTAL_AMOUNT)].join(",") + "\n";
  }

  csv += `\nGrand Total,${grandTotal}\n`;
  return csv;
}

export async function generateXlsxExport(reportData) {
  const { details, dailyTotals, workerTotals, grandTotal } = reportData;
  const workbook = new ExcelJS.Workbook();

  const detailsSheet = workbook.addWorksheet("Details");
 detailsSheet.columns = [
  { header: 'WORKER_NAME', key: 'WORKER_NAME', width: 25 },
  { header: 'ATTENDANCE_DATE', key: 'ATTENDANCE_DATE', width: 15 },
  { header: 'HOURS_WORKED', key: 'HOURS_WORKED', width: 12 },
  { header: 'AMOUNT', key: 'AMOUNT', width: 15 },
];
  detailsSheet.addRows(details);
  detailsSheet.getRow(1).font = { bold: true };
  detailsSheet.getColumn("AMOUNT").numFmt = "$#,##0.00";

  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.addRow(["Daily Totals"]).font = { bold: true };
  summarySheet.addRow(["ATTENDANCE_DATE", "TOTAL_AMOUNT"]).font = {
    bold: true,
  };
  for (const r of dailyTotals) {
    summarySheet.addRow([r.ATTENDANCE_DATE, r.TOTAL_AMOUNT]);
  }

  summarySheet.addRow([]);
  summarySheet.addRow(["Worker Totals"]).font = { bold: true };
  summarySheet.addRow(["WORKER_NAME", "TOTAL_AMOUNT"]).font = { bold: true };
  for (const r of workerTotals) {
    summarySheet.addRow([r.WORKER_NAME, r.TOTAL_AMOUNT]);
  }

  summarySheet.addRow([]);
  summarySheet.addRow(["Grand Total", grandTotal]).font = { bold: true };

  summarySheet.getColumn(2).numFmt = "$#,##0.00";

  summarySheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) maxLength = columnLength;
    });
    column.width = maxLength + 2;
  });

  return await workbook.xlsx.writeBuffer();
}

export async function generatePdfExport(reportData, filters) {
  const { details, dailyTotals, workerTotals, grandTotal } = reportData;

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "");
  const title = `Daily Money Report: ${formatDate(filters.FROM_DATE)} to ${formatDate(filters.TO_DATE)}`;
  let filterInfo = "";
  if (filters.WORKER_ID) filterInfo += `<p>Worker ID: ${filters.WORKER_ID}</p>`;
  if (filters.PROJECT_ID)
    filterInfo += `<p>Project ID: ${filters.PROJECT_ID}</p>`;

  const detailsRows = details.map(r => `
  <tr>
    <td>${r.WORKER_NAME || ''}</td>
    <td>${r.ATTENDANCE_DATE || ''}</td>
    <td>${r.HOURS_WORKED || 0}</td>
    <td style="text-align:right;">${Number(r.AMOUNT || 0).toFixed(2)}</td>
  </tr>
`).join('');

  const dailyRows = dailyTotals
    .map(
      (r) => `
    <tr>
      <td>${r.ATTENDANCE_DATE || ""}</td>
      <td style="text-align:right;">${Number(r.TOTAL_AMOUNT || 0).toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const workerRows = workerTotals
    .map(
      (r) => `
    <tr>
      <td>${r.WORKER_NAME || ""}</td>
      <td style="text-align:right;">${Number(r.TOTAL_AMOUNT || 0).toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        h1, h2 { text-align: left; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 6px; }
        th { background-color: #f2f2f2; text-align: left; }
        .text-right { text-align: right; }
        .grand-total { font-weight: bold; font-size: 14px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${filterInfo}
      
      <h2>Details</h2>
      <table>
        <thead>
         <tr>
  <th>Worker Name</th>
  <th>Date</th>
  <th>Hours</th>
  <th class="text-right">Amount</th>
</tr>
        </thead>
        <tbody>${detailsRows}</tbody>
      </table>

      <h2>Daily Totals</h2>
      <table>
        <thead>
          <tr><th>Date</th><th class="text-right">Total Amount</th></tr>
        </thead>
        <tbody>${dailyRows}</tbody>
      </table>

      <h2>Worker Totals</h2>
      <table>
        <thead>
          <tr><th>Worker Name</th><th class="text-right">Total Amount</th></tr>
        </thead>
        <tbody>${workerRows}</tbody>
      </table>

      <div class="grand-total">Grand Total: ${Number(grandTotal).toFixed(2)}</div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
