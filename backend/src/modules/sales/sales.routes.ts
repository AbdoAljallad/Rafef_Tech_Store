import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { parsePagination } from '../../shared/http/pagination.js';
import { SalesService } from './sales.service.js';
import { invoiceCreateSchema, invoiceLineSchema, invoiceApproveSchema, invoiceVoidSchema, returnCreateSchema } from './sales.schemas.js';

const router = Router();
const sales = new SalesService();

router.use(requireAuth);

router.get('/sales/invoices', requirePermission('sales.invoices.view'), asyncHandler(async (req, res) => {
  const { pageSize, offset } = parsePagination(req.query);
  res.json({ items: await sales.listInvoices(offset, pageSize) });
}));

router.post('/sales/invoices', requirePermission('sales.invoices.create'), asyncHandler(async (req, res) => {
  const payload = invoiceCreateSchema.parse(req.body);
  res.status(201).json({ invoice: await sales.createInvoice(payload, req.currentUser!.id, req.ip) });
}));

router.get('/sales/invoices/:id', requirePermission('sales.invoices.view'), asyncHandler(async (req, res) => {
  res.json({ invoice: await sales.getInvoice(parseId(req.params.id)) });
}));

router.post('/sales/invoices/:id/approve', requirePermission('sales.invoices.approve'), asyncHandler(async (req, res) => {
  invoiceApproveSchema.parse(req.body);
  res.json({ invoice: await sales.approveInvoice(parseId(req.params.id), req.currentUser!.id, req.ip) });
}));

router.post('/sales/invoices/:id/void', requirePermission('sales.invoices.void'), asyncHandler(async (req, res) => {
  invoiceVoidSchema.parse(req.body);
  res.json({ invoice: await sales.voidInvoice(parseId(req.params.id), req.currentUser!.id, req.ip) });
}));

router.post('/sales/returns', requirePermission('sales.returns.create'), asyncHandler(async (req, res) => {
  const payload = returnCreateSchema.parse(req.body);
  res.status(201).json({ return: await sales.createReturn(payload, req.currentUser!.id, req.ip) });
}));

export { router as salesRouter };
