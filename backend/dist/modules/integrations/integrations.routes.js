import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { IntegrationsService } from './integrations.service.js';
const router = Router();
const integrations = new IntegrationsService();
router.use(requireAuth);
router.get('/integrations/health', requirePermission('integrations.view'), asyncHandler(async (_req, res) => {
    res.json({ health: await integrations.health() });
}));
router.get('/integrations/webhook-outbox', requirePermission('integrations.view'), asyncHandler(async (_req, res) => {
    res.json({ items: await integrations.outbox() });
}));
export { router as integrationsRouter };
