import {
  processCsvToStaging, getStagingByBatch, getStagingFiltered, approveAndMoveToMain,
  getMainTransactions, getLatestPendingBatch, getAllProjects, getAllContractors,
  updateStagingRow, uploadInvoiceFile, deleteInvoiceFile, getInvoiceFile, getMainInvoiceFile,
  insertNonBankingEntry, getProjectReport
} from './service.js';

export async function statementHandler(req, res) {
  const action = req.params.action || req.query.action || inferAction(req);

  switch (action) {
    case 'upload': {
      if (!req.file || !req.file.buffer)
        return res.status(400).json({ success: false, message: 'CSV file is required.' });
      const csvText = req.file.buffer.toString('utf8');
      const userId  = req.user?.userId || req.body.userId || null;
      const result  = await processCsvToStaging(csvText, userId);
      return res.status(200).json({
        success: true,
        message: `${result.count} new row(s) processed into staging.`,
        batchId: result.batchId,
        skipped: result.skipped
      });
    }

    case 'getStaging': {
      const { batchId } = req.params;
      if (!batchId) return res.status(400).json({ success: false, message: 'batchId is required.' });
      const rows = await getStagingByBatch(batchId);
      return res.status(200).json({ success: true, data: rows });
    }

    case 'getStagingAll': {
      const filters = {
        sourceType:     req.query.sourceType     || null,
        status:         req.query.status         || null,
        dateFrom:       req.query.dateFrom       || null,
        dateTo:         req.query.dateTo         || null,
        pId:            req.query.pId            || null,
        contractorId:   req.query.contractorId   || null,
        invoiceNo:      req.query.invoiceNo      || null,
        amountMin:      req.query.amountMin      || null,
        amountMax:      req.query.amountMax      || null,
        description:    req.query.description    || null,
        category:       req.query.category       || null,
        matchedAddress: req.query.matchedAddress || null,
      };
      const rows = await getStagingFiltered(filters);
      return res.status(200).json({ success: true, data: rows });
    }

    case 'approve': {
      const { stagingIds } = req.body;
      const approvedBy = req.user?.userId || req.body.approvedBy || null;
      if (!Array.isArray(stagingIds) || stagingIds.length === 0)
        return res.status(400).json({ success: false, message: 'stagingIds array is required.' });
      const result = await approveAndMoveToMain(stagingIds, approvedBy);
      return res.status(200).json({ success: true, message: `${result.moved} row(s) approved and moved to main.` });
    }

    case 'getLatestBatch': {
      const batchId = await getLatestPendingBatch();
      return res.status(200).json({ success: true, batchId });
    }

    case 'getProjects': {
      const projects = await getAllProjects();
      return res.status(200).json({ success: true, data: projects });
    }

    case 'getContractors': {
      const contractors = await getAllContractors();
      return res.status(200).json({ success: true, data: contractors });
    }

    case 'updateRow': {
      const { stagingId, pId, projectName, contractorId, contractorName, invoiceNo, remarks, category } = req.body;
      if (!stagingId) return res.status(400).json({ success: false, message: 'stagingId is required.' });
      const result = await updateStagingRow(stagingId, { pId, projectName, contractorId, contractorName, invoiceNo, remarks, category });
      return res.status(200).json({ success: true, ...result });
    }

    case 'uploadInvoice': {
      const { stagingId } = req.params;
      if (!stagingId) return res.status(400).json({ success: false, message: 'stagingId is required.' });
      if (!req.file)  return res.status(400).json({ success: false, message: 'Invoice file is required.' });
      const result = await uploadInvoiceFile(stagingId, req.file);
      return res.status(200).json({ success: true, message: 'Invoice uploaded.', ...result });
    }

    case 'deleteInvoice': {
      const { stagingId } = req.params;
      if (!stagingId) return res.status(400).json({ success: false, message: 'stagingId is required.' });
      const result = await deleteInvoiceFile(stagingId);
      return res.status(200).json({ success: true, message: 'Invoice file deleted.', ...result });
    }

    case 'getInvoiceFile': {
      const { stagingId } = req.params;
      const file = await getInvoiceFile(stagingId);
      if (!file) return res.status(404).json({ success: false, message: 'No invoice file found.' });
      res.setHeader('Content-Type', file.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${file.fileName || 'invoice'}"`);
      return res.send(file.buffer);
    }

    case 'getMainInvoiceFile': {
      const { txnId } = req.params;
      if (!txnId) return res.status(400).json({ success: false, message: 'txnId is required.' });
      const file = await getMainInvoiceFile(txnId);
      if (!file) return res.status(404).json({ success: false, message: 'No invoice file found.' });
      res.setHeader('Content-Type', file.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${file.fileName || 'invoice'}"`);
      return res.send(file.buffer);
    }

    case 'insertNonBanking': {
      const userId = req.user?.userId || req.body.userId || null;
      const result = await insertNonBankingEntry(req.body, userId);
      return res.status(200).json({ success: true, message: 'Entry added to staging.', batchId: result.batchId });
    }

    case 'getProjectReport': {
  const { pId } = req.params;
  if (!pId) return res.status(400).json({ success: false, message: 'pId is required.' });
  const rows = await getProjectReport(pId);
  return res.status(200).json({ success: true, data: rows });
}

   case 'getMain': {
      const filters = {
        pId:            req.query.pId            || null,
        category:       req.query.category       || null,
        sourceType:     req.query.sourceType     || null,
        dateFrom:       req.query.dateFrom       || null,
        dateTo:         req.query.dateTo         || null,
        contractorId:   req.query.contractorId   || null,
        invoiceNo:      req.query.invoiceNo      || null,
        amountMin:      req.query.amountMin      || null,
        amountMax:      req.query.amountMax      || null,
        description:    req.query.description    || null,
        matchedAddress: req.query.matchedAddress || null,
      };
      const rows = await getMainTransactions(filters);
      return res.status(200).json({ success: true, data: rows });
    }
    default:
      return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
  }


}


function inferAction(req) {
  const method = req.method;
  const path   = req.path || req.url || '';
  if (method === 'GET' && path.includes('project-report')) return 'getProjectReport';
  if (method === 'DELETE' && path.includes('invoice'))              return 'deleteInvoice';
  if (method === 'POST' && path.includes('non-banking'))            return 'insertNonBanking';
  if (method === 'POST' && path.includes('invoice'))                return 'uploadInvoice';
  if (method === 'GET'  && path.includes('main') && path.includes('invoice')) return 'getMainInvoiceFile';
  if (method === 'GET'  && path.includes('invoice'))                return 'getInvoiceFile';
  if (method === 'POST' && path.includes('upload'))                 return 'upload';
  if (method === 'POST' && path.includes('approve'))                return 'approve';
  if (method === 'PUT'  && path.includes('row'))                    return 'updateRow';
  if (method === 'GET'  && path.includes('staging/all'))            return 'getStagingAll';
  if (method === 'GET'  && path.includes('staging'))                return 'getStaging';
  if (method === 'GET'  && path.includes('main'))                   return 'getMain';
  if (method === 'GET'  && path.includes('latest'))                 return 'getLatestBatch';
  if (method === 'GET'  && path.includes('project'))                return 'getProjects';
  if (method === 'GET'  && path.includes('contract'))               return 'getContractors';
  

  return null;
}