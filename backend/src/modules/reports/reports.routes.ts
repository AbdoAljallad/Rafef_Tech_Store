import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { ReportsService } from './reports.service.js';

const router = Router();
const reports = new ReportsService();

router.use(requireAuth);

router.get('/reports/sales', requirePermission('reports.sales.view'), asyncHandler(async (_req, res) => res.json({ report: await reports.sales() })));
router.get('/reports/inventory', requirePermission('reports.inventory.view'), asyncHandler(async (_req, res) => res.json({ report: await reports.inventory() })));
router.get('/reports/finance', requirePermission('reports.finance.view'), asyncHandler(async (_req, res) => res.json({ report: await reports.finance() })));
router.get('/reports/repair', requirePermission('reports.repair.view'), asyncHandler(async (_req, res) => res.json({ report: await reports.repair() })));
router.get('/reports/projects', requirePermission('reports.projects.view'), asyncHandler(async (_req, res) => res.json({ report: await reports.projects() })));
router.get('/reports/creative', requirePermission('reports.creative.view'), asyncHandler(async (_req, res) => res.json({ report: await reports.creative() })));

export { router as reportsRouter };
