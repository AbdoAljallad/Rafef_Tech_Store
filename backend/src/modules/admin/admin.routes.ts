import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { AdminService } from './admin.service.js';

const router = Router();
const admin = new AdminService();

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(160),
  roleId: z.coerce.number().int().positive(),
  status: z.enum(['active', 'disabled', 'locked']).default('active'),
  maxDiscountPercent: z.coerce.number().min(0).max(100).nullable().optional(),
});

router.use(requireAuth);

router.get('/admin/users', requirePermission('auth.users.view'), asyncHandler(async (_req, res) => res.json({ items: await admin.users() })));
router.post(
  '/admin/users',
  requirePermission('auth.users.manage'),
  asyncHandler(async (req, res) => {
    const body = createUserSchema.parse(req.body);
    const user = await admin.createUser({
      username: body.username,
      password: body.password,
      displayName: body.displayName,
      roleId: body.roleId,
      status: body.status,
      maxDiscountPercent: body.maxDiscountPercent,
      actorUserId: req.currentUser?.id,
      ipAddress: req.ip,
    });

    res.status(201).json({ user });
  }),
);
router.get('/admin/roles', requirePermission('auth.users.view'), asyncHandler(async (_req, res) => res.json({ items: await admin.roles() })));
router.get('/admin/permissions', requirePermission('auth.permissions.manage'), asyncHandler(async (_req, res) => res.json({ items: await admin.permissions() })));
router.get('/admin/settings', requirePermission('auth.users.view'), asyncHandler(async (_req, res) => res.json({ settings: admin.settings() })));

export { router as adminRouter };
