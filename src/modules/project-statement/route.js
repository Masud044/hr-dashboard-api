// src\modules\project-statement\route.js
import express from 'express';
import multer from 'multer';
import { statementHandler } from './controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { protectRouteV2 } from '../auth-v2/auth-v2.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── PUBLIC file-serving routes (no auth required) ──
// These are hit directly by <img src>, <a href>, and download links,
// which don't send an Authorization header. Must stay BEFORE
// router.use(protectRouteV2) below.
router.get('/staging/:stagingId/invoice',
  asyncHandler((req, res) => { req.params.action = 'getInvoiceFile'; return statementHandler(req, res); })
);

router.get('/main/:txnId/invoice',
  asyncHandler((req, res) => { req.params.action = 'getMainInvoiceFile'; return statementHandler(req, res); })
);

router.get('/invoices/files/:fileId',
  asyncHandler((req, res) => { req.params.action = 'getInvoiceFileById'; return statementHandler(req, res); })
);

// ── Everything below this line requires a valid Bearer token ──
router.use(protectRouteV2);

router.post('/upload',
  upload.single('file'),
  asyncHandler((req, res) => { req.params.action = 'upload'; return statementHandler(req, res); })
);

router.get('/staging/all',
  asyncHandler((req, res) => { req.params.action = 'getStagingAll'; return statementHandler(req, res); })
);

router.get('/staging/stats',
  asyncHandler((req, res) => { req.params.action = 'getStagingStats'; return statementHandler(req, res); })
);
router.get('/staging/:batchId',
  asyncHandler((req, res) => { req.params.action = 'getStaging'; return statementHandler(req, res); })
);

router.post('/approve',
  asyncHandler((req, res) => { req.params.action = 'approve'; return statementHandler(req, res); })
);

// ── NEW: Disapprove Route ──
router.post('/disapprove',
  asyncHandler((req, res) => { req.params.action = 'disapprove'; return statementHandler(req, res); })
);
router.get('/main',
  asyncHandler((req, res) => { req.params.action = 'getMain'; return statementHandler(req, res); })
);

router.get('/latest-batch',
  asyncHandler((req, res) => { req.params.action = 'getLatestBatch'; return statementHandler(req, res); })
);

router.get('/projects',
  asyncHandler((req, res) => { req.params.action = 'getProjects'; return statementHandler(req, res); })
);

router.get('/contractors',
  asyncHandler((req, res) => { req.params.action = 'getContractors'; return statementHandler(req, res); })
);

router.put('/staging/row',
  asyncHandler((req, res) => { req.params.action = 'updateRow'; return statementHandler(req, res); })
);

router.post('/staging/:stagingId/rematch',
  asyncHandler((req, res) => { req.params.action = 'rematchRow'; return statementHandler(req, res); })
);

router.post('/staging/:stagingId/invoice',
  upload.single('invoiceFile'),
  asyncHandler((req, res) => { req.params.action = 'uploadInvoice'; return statementHandler(req, res); })
);

router.delete('/staging/:stagingId/invoice',
  asyncHandler((req, res) => { req.params.action = 'deleteInvoice'; return statementHandler(req, res); })
);

router.post('/non-banking',
  asyncHandler((req, res) => { req.params.action = 'insertNonBanking'; return statementHandler(req, res); })
);

router.get('/project-report/:pId',
  asyncHandler((req, res) => { req.params.action = 'getProjectReport'; return statementHandler(req, res); })
);

router.put('/main/row',
  asyncHandler((req, res) => { req.params.action = 'updateMainRow'; return statementHandler(req, res); })
);

router.post('/main/:txnId/invoice',
  upload.single('invoiceFile'),
  asyncHandler((req, res) => { req.params.action = 'uploadMainInvoice'; return statementHandler(req, res); })
);

router.delete('/main/:txnId/invoice',
  asyncHandler((req, res) => { req.params.action = 'deleteMainInvoice'; return statementHandler(req, res); })
);

// ── Invoice group CRUD (staging/main parent invoices) ──
router.get('/:parentType/:parentId/transaction',
  asyncHandler((req, res) => { req.params.action = 'getTransactionById'; return statementHandler(req, res); })
);
router.get('/:parentType/:parentId/invoices',
  asyncHandler((req, res) => { req.params.action = 'getInvoices'; return statementHandler(req, res); })
);

router.post('/:parentType/:parentId/invoices',
  upload.array('files'),
  asyncHandler((req, res) => { req.params.action = 'addInvoice'; return statementHandler(req, res); })
);

router.delete('/invoices/:invoiceId',
  asyncHandler((req, res) => { req.params.action = 'deleteInvoiceGroup'; return statementHandler(req, res); })
);

router.delete('/staging/:stagingId',
  asyncHandler((req, res) => { req.params.action = 'deleteStagingRow'; return statementHandler(req, res); })
);

// ── Individual file management within an invoice group ──
// NOTE: these must be declared before any conflicting generic routes,
// and use paths that match what InvoiceSheet.jsx actually calls.

router.post('/invoices/:invoiceId/files',
  upload.single('file'),
  asyncHandler((req, res) => { req.params.action = 'addFileToInvoice'; return statementHandler(req, res); })
);

router.delete('/invoices/files/:fileId',
  asyncHandler((req, res) => { req.params.action = 'deleteInvoiceFileRow'; return statementHandler(req, res); })
);

export default router;