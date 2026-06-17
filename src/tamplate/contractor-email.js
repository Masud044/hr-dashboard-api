export function bulkContractorTemplate({ contractorName, message, projectName, projectAddress }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
    <div style="background:#1d4ed8;padding:20px;border-radius:8px 8px 0 0;">
      <h2 style="color:#fff;margin:0;">Notice from Project Management Team</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      <p>Dear ${contractorName},</p>
      <p style="white-space:pre-line;">${message}</p>
      ${projectName ? `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Project</td><td style="padding:6px 0;font-weight:600;">${projectName}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Address</td><td style="padding:6px 0;">${projectAddress}</td></tr>
      </table>` : ""}
      <p style="margin-top:24px;">Best regards,<br/>Project Management Team</p>
    </div>
  </div>`;
}