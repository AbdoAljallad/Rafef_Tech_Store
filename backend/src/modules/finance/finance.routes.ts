import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import {
  paymentAccountCreateSchema,
  paymentMethodCreateSchema,
  transactionCreateSchema,
  expenseCreateSchema,
  refundCreateSchema,
  workSessionStartSchema,
  workSessionCloseSchema,
  dailyClosingCreateSchema,
} from './finance.schemas.js';
import { FinanceService } from './finance.service.js';

const router = Router();
const svc = new FinanceService();

router.use(requireAuth);

router.get('/finance/dashboard', requirePermission('finance.accounts.view'), asyncHandler(async (_req, res) => res.json(await svc.getDashboard())));
router.get('/finance/accounts', requirePermission('finance.accounts.view'), asyncHandler(async (_req, res) => res.json({ items: await svc.listAccounts() })));
router.post('/finance/accounts', requirePermission('finance.accounts.manage'), asyncHandler(async (req, res) => res.status(201).json({
  account: await svc.createAccount({
    ...paymentAccountCreateSchema.parse(req.body),
    createdBy: req.currentUser!.id,
  }),
})));

router.get('/finance/payment-methods', requirePermission('finance.payments.create'), asyncHandler(async (_req, res) => res.json({ items: await svc.listMethods() })));
router.post('/finance/payment-methods', requirePermission('finance.accounts.manage'), asyncHandler(async (req, res) => res.status(201).json({
  method: await svc.createMethod({
    ...paymentMethodCreateSchema.parse(req.body),
    createdBy: req.currentUser!.id,
  }),
})));

router.get('/finance/transactions', requirePermission('finance.payments.create'), asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit ?? 30);
  res.json({ items: await svc.listTransactions({ limit: Number.isFinite(limit) ? limit : 30 }) });
}));
router.post('/finance/transactions', requirePermission('finance.payments.create'), asyncHandler(async (req, res) => res.status(201).json({
  transaction: await svc.createTransaction({
    ...transactionCreateSchema.parse(req.body),
    createdBy: req.currentUser!.id,
  }),
})));

router.post('/finance/customers/:id/ledger', requirePermission('finance.ledger.view'), asyncHandler(async (req, res) => {
  const customerId = Number(req.params.id);
  const body = req.body;
  const created = await svc.createCustomerLedger({ customerId, transactionId: body.transactionId ?? null, change: Number(body.change), balanceAfter: Number(body.balanceAfter), notes: body.notes ?? null, createdBy: req.currentUser!.id });
  res.status(201).json({ entry: created });
}));

router.post('/finance/expenses', requirePermission('finance.expenses.manage'), asyncHandler(async (req, res) => res.status(201).json({
  expense: await svc.createExpense({
    ...expenseCreateSchema.parse(req.body),
    createdBy: req.currentUser!.id,
  }),
})));

router.post('/finance/refunds', requirePermission('finance.refunds.approve'), asyncHandler(async (req, res) => res.status(201).json({
  refund: await svc.createRefund({
    ...refundCreateSchema.parse(req.body),
    processedBy: req.currentUser!.id,
  }),
})));

router.post('/finance/work-sessions', requirePermission('finance.daily_closing.manage'), asyncHandler(async (req, res) => {
  const body = workSessionStartSchema.parse(req.body);
  const userId = req.currentUser?.id ?? body.userId;
  const session = await svc.startWorkSession({ userId: Number(userId), startingBalance: body.startingBalance ?? null, notes: body.notes ?? null });
  res.status(201).json({ session });
}));
router.post('/finance/work-sessions/:id/close', requirePermission('finance.daily_closing.manage'), asyncHandler(async (req, res) => res.json({ session: await svc.closeWorkSession(Number(req.params.id), workSessionCloseSchema.parse(req.body)) })));

router.post('/finance/daily-closings', requirePermission('finance.daily_closing.manage'), asyncHandler(async (req, res) => res.status(201).json({
  closing: await svc.createDailyClosing({
    ...dailyClosingCreateSchema.parse(req.body),
    closedBy: req.currentUser!.id,
  }),
})));

export { router as financeRouter };
