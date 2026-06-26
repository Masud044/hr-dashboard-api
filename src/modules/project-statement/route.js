// import express from 'express';
// import multer from 'multer';
// import { statementHandler } from './controller.js';
// import { asyncHandler } from '../../utils/asyncHandler.js'; // adjust path to your actual asyncHandler location

// const router = express.Router();

// // CSV file memory-te rakha hobe (BLOB-er moto, disk-e save na)
// const upload = multer({ storage: multer.memoryStorage() });

// // 1. CSV upload -> process -> staging table-e insert
// router.post(
//   '/upload',
//   upload.single('file'),
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'upload' } }, res))
// );

// // 2. Staging-er ekta batch-er sob row dekha (review korar jonno)
// router.get(
//   '/staging/:batchId',
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'getStaging' } }, res))
// );

// // 3. "Approve & Move to Main" button -> selected staging rows main-e move
// router.post(
//   '/approve',
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'approve' } }, res))
// );

// // 4. Main table-er approved transactions dekha (project-wise filter soho)
// router.get(
//   '/main',
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'getMain' } }, res))
// );

// // 5. Refresh er por last pending batch ber kora (jate CSV abar upload korte na hoy)
// router.get(
//   '/latest-batch',
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'getLatestBatch' } }, res))
// );

// // 6. Dropdown-er jonno shob project list (manual select korar jonno, auto-match na hole)
// router.get(
//   '/projects',
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'getProjects' } }, res))
// );

// // 7. Dropdown-er jonno shob contractor list (manual select korar jonno, auto-match na hole)
// router.get(
//   '/contractors',
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'getContractors' } }, res))
// );

// // 8. Ekta staging row manually update (project/contractor/invoice no set kora)
// router.put(
//   '/staging/row',
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'updateRow' } }, res))
// );

// // 9. Invoice file upload - ekta staging row-e attach kora (BLOB store)
// router.post(
//   '/staging/:stagingId/invoice',
//   upload.single('invoiceFile'),
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'uploadInvoice' } }, res))
// );

// // 10. Invoice file view/download
// router.get(
//   '/staging/:stagingId/invoice',
//   asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'getInvoiceFile' } }, res))
// );

// export default router;

import express from 'express';
import multer from 'multer';
import { statementHandler } from './controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload',
  upload.single('file'),
  asyncHandler((req, res) => {
    req.params.action = 'upload';          // ← directly set, no spread
    return statementHandler(req, res);
  })
);

router.get('/staging/:batchId',
  asyncHandler((req, res) => {
    req.params.action = 'getStaging';
    return statementHandler(req, res);
  })
);

router.post('/approve',
  asyncHandler((req, res) => {
    req.params.action = 'approve';
    return statementHandler(req, res);
  })
);

router.get('/main',
  asyncHandler((req, res) => {
    req.params.action = 'getMain';
    return statementHandler(req, res);
  })
);

router.get('/latest-batch',
  asyncHandler((req, res) => {
    req.params.action = 'getLatestBatch';
    return statementHandler(req, res);
  })
);

router.get('/projects',
  asyncHandler((req, res) => {
    req.params.action = 'getProjects';
    return statementHandler(req, res);
  })
);

router.get('/contractors',
  asyncHandler((req, res) => {
    req.params.action = 'getContractors';
    return statementHandler(req, res);
  })
);

router.put('/staging/row',
  asyncHandler((req, res) => {
    req.params.action = 'updateRow';
    return statementHandler(req, res);
  })
);

router.post('/staging/:stagingId/invoice',
  upload.single('invoiceFile'),
  asyncHandler((req, res) => {
    req.params.action = 'uploadInvoice';
    return statementHandler(req, res);
  })
);

router.get('/staging/:stagingId/invoice',
  asyncHandler((req, res) => {
    req.params.action = 'getInvoiceFile';
    return statementHandler(req, res);
  })
);

export default router;