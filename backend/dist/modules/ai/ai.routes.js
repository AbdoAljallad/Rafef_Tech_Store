import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { safeCommandSchema } from './ai.schemas.js';
import { AiAssistantService } from './ai.service.js';
const router = Router();
const ai = new AiAssistantService();
router.use(requireAuth);
router.get('/ai/assistant/status', requirePermission('ai.assistant.use'), asyncHandler(async (req, res) => {
    res.json({ assistant: ai.status(req.currentUser) });
}));
router.post('/ai/assistant/commands', requirePermission('ai.assistant.use'), asyncHandler(async (req, res) => {
    res.status(202).json({ command: await ai.safeCommand(safeCommandSchema.parse(req.body), req.currentUser, req.ip) });
}));
export { router as aiRouter };
