import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { IntegrationsService } from './integrations.service.js';
const router = Router();
const integrations = new IntegrationsService();
const processOutboxSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
});
function requireIntegrationSecret(secretName) {
    return (req, _res, next) => {
        const configuredSecret = env[secretName];
        const providedSecret = req.header('X-Rafef-Integration-Secret');
        if (!configuredSecret) {
            next(new AppError(503, 'INTEGRATION_SECRET_NOT_CONFIGURED', 'Integration secret is not configured'));
            return;
        }
        if (providedSecret !== configuredSecret) {
            next(new AppError(401, 'INVALID_INTEGRATION_SECRET', 'Invalid integration secret'));
            return;
        }
        next();
    };
}
router.post('/integrations/n8n/inbound', requireIntegrationSecret('N8N_SHARED_SECRET'), asyncHandler(async (req, res) => {
    res.status(202).json({ event: integrations.acceptN8nInbound(req.body) });
}));
router.use(requireAuth);
router.get('/integrations/health', requirePermission('integrations.view'), asyncHandler(async (_req, res) => {
    res.json({ health: await integrations.health() });
}));
router.get('/integrations/webhook-outbox', requirePermission('integrations.view'), asyncHandler(async (_req, res) => {
    res.json({ items: await integrations.outbox() });
}));
router.post('/integrations/webhook-outbox/process', requirePermission('integrations.manage'), asyncHandler(async (req, res) => {
    const input = processOutboxSchema.parse(req.body ?? {});
    res.json({ result: await integrations.processOutbox(input.limit) });
}));
router.post('/integrations/n8n/test', requirePermission('integrations.manage'), asyncHandler(async (req, res) => {
    res.status(202).json({ event: await integrations.enqueueN8nTest(req.currentUser.id) });
}));
export { router as integrationsRouter };
