// src\modules\worker-attendance\report.controller.js
import { 
  getDailyMoneyReport, 
  generateCsvExport, 
  generateXlsxExport, 
  generatePdfExport 
} from "./report.service.js";

export async function handleDailyMoneyReport(req, res) {
  const { from_date, to_date, worker_id, project_id, format } = req.query;

  if (!from_date || !to_date) {
    return res.status(400).json({
      success: false,
      message: "from_date and to_date query parameters are required.",
    });
  }

  const filters = {
    FROM_DATE: from_date,
    TO_DATE: to_date,
    WORKER_ID: worker_id,
    PROJECT_ID: project_id,
  };

  const reportData = await getDailyMoneyReport(filters);
  const fmt = (format || 'json').toLowerCase();
  const filename = `daily-report-${from_date}-to-${to_date}`;

  if (fmt === 'csv') {
    try {
      const csv = generateCsvExport(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    } catch (err) {
      return res.status(500).json({ success: false, message: "Failed to generate CSV export.", error: err.message });
    }
  }

  if (fmt === 'xlsx') {
    try {
      const buffer = await generateXlsxExport(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.send(buffer);
    } catch (err) {
      return res.status(500).json({ success: false, message: "Failed to generate XLSX export.", error: err.message });
    }
  }

  if (fmt === 'pdf') {
    try {
      const buffer = await generatePdfExport(reportData, filters);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      return res.send(buffer);
    } catch (err) {
      return res.status(500).json({ success: false, message: "Failed to generate PDF export.", error: err.message });
    }
  }

  return res.json({ success: true, ...reportData });
}