import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { resolveRequestLanguage } from '../../shared/localization/requestLanguage.js';
import { ReportsService } from './reports.service.js';
import type { ReportFilters } from './reports.repository.js';

const router = Router();
const reports = new ReportsService();

function normalizeDate(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function parseFilters(query: Record<string, unknown>): ReportFilters {
  const dateFrom = normalizeDate(query.dateFrom);
  const dateTo = normalizeDate(query.dateTo);

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return { dateFrom: dateTo, dateTo: dateFrom };
  }

  return { dateFrom, dateTo };
}

router.use(requireAuth);

router.get('/reports/dashboard', asyncHandler(async (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  const permissions = req.currentUser?.permissions ?? [];
  res.json(await reports.dashboard(permissions, filters, resolveRequestLanguage(req)));
}));

router.get('/reports/sales', requirePermission('reports.sales.view'), asyncHandler(async (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  res.json(await reports.sales(filters, resolveRequestLanguage(req)));
}));

router.get('/reports/inventory', requirePermission('reports.inventory.view'), asyncHandler(async (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  res.json(await reports.inventory(filters, resolveRequestLanguage(req)));
}));

router.get('/reports/finance', requirePermission('reports.finance.view'), asyncHandler(async (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  res.json(await reports.finance(filters));
}));

router.get('/reports/repair', requirePermission('reports.repair.view'), asyncHandler(async (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  res.json(await reports.repair(filters, resolveRequestLanguage(req)));
}));

router.get('/reports/projects', requirePermission('reports.projects.view'), asyncHandler(async (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  res.json(await reports.projects(filters, resolveRequestLanguage(req)));
}));

router.get('/reports/creative', requirePermission('reports.creative.view'), asyncHandler(async (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  res.json(await reports.creative(filters, resolveRequestLanguage(req)));
}));

router.get('/reports/customers', requirePermission('reports.customers.view'), asyncHandler(async (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  res.json(await reports.customers(filters, resolveRequestLanguage(req)));
}));

router.get('/reports/profit', requirePermission('reports.profit.view'), asyncHandler(async (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  res.json(await reports.profit(filters, resolveRequestLanguage(req)));
}));

export { router as reportsRouter };
