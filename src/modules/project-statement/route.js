import express from 'express';
import multer from 'multer';
import { statementHandler } from './controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js'; // adjust path to your actual asyncHandler location

const router = express.Router();

// CSV file memory-te rakha hobe (BLOB-er moto, disk-e save na)
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'upload' } }, res))
);
 
// 2. Staging-er ekta batch-er sob row dekha (review korar jonno)
router.get(
  '/staging/:batchId',
  asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'getStaging' } }, res))
);
 
// 3. "Approve & Move to Main" button -> selected staging rows main-e move
router.post(
  '/approve',
  asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'approve' } }, res))
);
 
// 4. Main table-er approved transactions dekha (project-wise filter soho)
router.get(
  '/main',
  asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'getMain' } }, res))
);
 
// 5. Refresh er por last pending batch ber kora (jate CSV abar upload korte na hoy)
router.get(
  '/latest-batch',
  asyncHandler((req, res) => statementHandler({ ...req, params: { ...req.params, action: 'getLatestBatch' } }, res))
);
export default router;