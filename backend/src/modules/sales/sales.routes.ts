import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { parsePagination } from '../../shared/http/pagination.js';
import { resolveRequestLanguage } from '../../shared/localization/requestLanguage.js';
import { SalesService } from './sales.service.js';
import {
  invoiceApproveSchema,
  invoiceCreateSchema,
  invoiceListQuerySchema,
  invoiceUpdateSchema,
  invoiceVoidSchema,
  returnCreateSchema,
} from './sales.schemas.js';

const router = Router();
const sales = new SalesService();

router.use(requireAuth);

router.get('/sales/invoices', requirePermission('sales.invoices.view'), asyncHandler(async (req, res) => {
  const filters = invoiceListQuerySchema.parse(req.query);
  const { page, pageSize, offset } = parsePagination(req.query);
  const result = await sales.listInvoices({
    offset,
    limit: pageSize,
    search: filters.search,
    documentType: filters.documentType,
    status: filters.status,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    language: resolveRequestLanguage(req),
  });

  res.json({
    items: result.items,
    meta: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    },
  });
}));

router.post('/sales/invoices', requirePermission('sales.invoices.create'), asyncHandler(async (req, res) => {
  const payload = invoiceCreateSchema.parse(req.body);
  res.status(201).json({ invoice: await sales.createInvoice(payload, req.currentUser!.id, req.ip, resolveRequestLanguage(req)) });
}));

router.get('/sales/invoices/:id', requirePermission('sales.invoices.view'), asyncHandler(async (req, res) => {
  res.json({ invoice: await sales.getInvoice(parseId(req.params.id), resolveRequestLanguage(req)) });
}));

router.patch('/sales/invoices/:id', requirePermission('sales.invoices.view'), asyncHandler(async (req, res) => {
  const payload = invoiceUpdateSchema.parse(req.body);
  res.json({
    invoice: await sales.updateInvoicePrintContent(
      parseId(req.params.id),
      payload,
      req.currentUser!.id,
      req.ip,
      resolveRequestLanguage(req),
    ),
  });
}));

router.post('/sales/invoices/:id/approve', requirePermission('sales.invoices.approve'), asyncHandler(async (req, res) => {
  const payload = invoiceApproveSchema.parse(req.body);
  res.json({
    invoice: await sales.approveInvoice(
      parseId(req.params.id),
      req.currentUser!.id,
      {
        paymentAccountId: payload.paymentAccountId ?? null,
        paymentMethodId: payload.paymentMethodId ?? null,
        paymentAmount: payload.paymentAmount ?? null,
        paymentReference: payload.paymentReference ?? null,
      },
      req.ip,
      resolveRequestLanguage(req),
    ),
  });
}));

router.post('/sales/invoices/:id/void', requirePermission('sales.invoices.void'), asyncHandler(async (req, res) => {
  invoiceVoidSchema.parse(req.body);
  res.json({ invoice: await sales.voidInvoice(parseId(req.params.id), req.currentUser!.id, req.ip, resolveRequestLanguage(req)) });
}));

router.post('/sales/returns', requirePermission('sales.returns.create'), asyncHandler(async (req, res) => {
  const payload = returnCreateSchema.parse(req.body);
  res.status(201).json({ return: await sales.createReturn(payload, req.currentUser!.id, req.ip) });
}));

export { router as salesRouter };
