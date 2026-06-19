import {
  processCsvToStaging,
  getStagingByBatch,
  approveAndMoveToMain,
  getMainTransactions,
  getLatestPendingBatch
} from './service.js';

/**
 * Single handler, req.method/action diye branch kore.
 * Apnar existing pattern follow kore: ekta function-e shob route-er logic.
 *
 * Routes (router.js-e map kora hobe):
 *   POST   /statements/upload          -> action = 'upload'
 *   GET    /statements/staging/:batchId -> action = 'getStaging'
 *   POST   /statements/approve          -> action = 'approve'
 *   GET    /statements/main             -> action = 'getMain'
 */
export async function statementHandler(req, res) {
  const action = req.params.action || req.query.action || inferAction(req);

  switch (action) {
    case 'upload': {
      // multer memoryStorage diye CSV file -> req.file.buffer
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'CSV file is required.' });
      }
      const csvText = req.file.buffer.toString('utf8');
      const userId = req.user?.userId || req.body.userId || null;

      const result = await processCsvToStaging(csvText, userId);
      return res.status(200).json({
        success: true,
        message: `${result.count} new row(s) processed into staging.`,
        batchId: result.batchId,
        skipped: result.skipped
      });
    }

    case 'getStaging': {
      const { batchId } = req.params;
      if (!batchId) {
        return res.status(400).json({ success: false, message: 'batchId is required.' });
      }
      const rows = await getStagingByBatch(batchId);
      return res.status(200).json({ success: true, data: rows });
    }

    case 'approve': {
      const { stagingIds } = req.body;
      const approvedBy = req.user?.userId || req.body.approvedBy || null;

      if (!Array.isArray(stagingIds) || stagingIds.length === 0) {
        return res.status(400).json({ success: false, message: 'stagingIds array is required.' });
      }

      const result = await approveAndMoveToMain(stagingIds, approvedBy);
      return res.status(200).json({
        success: true,
        message: `${result.moved} row(s) approved and moved to main.`
      });
    }

    case 'getLatestBatch': {
      const batchId = await getLatestPendingBatch();
      return res.status(200).json({ success: true, batchId });
    }

    case 'getMain': {
      const filters = {
        pId: req.query.pId || null,
        category: req.query.category || null
      };
      const rows = await getMainTransactions(filters);
      return res.status(200).json({ success: true, data: rows });
    }

    default:
      return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
  }
}

// req.method + path diye action ber kora (jodi explicit action na pathano hoy)
function inferAction(req) {
  if (req.method === 'POST' && req.path.includes('upload')) return 'upload';
  if (req.method === 'POST' && req.path.includes('approve')) return 'approve';
  if (req.method === 'GET' && req.path.includes('staging')) return 'getStaging';
  if (req.method === 'GET' && req.path.includes('main')) return 'getMain';
  return null;
}