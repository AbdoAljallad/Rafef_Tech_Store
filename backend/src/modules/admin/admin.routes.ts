import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { AdminService } from './admin.service.js';

const router = Router();
const admin = new AdminService();

const optionalImage = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine((value) => value == null || value === '' || value.startsWith('data:image/'), 'INVALID_IMAGE')
  .transform((value) => value || null);

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(160),
  avatarUrl: optionalImage,
  roleId: z.coerce.number().int().positive(),
  status: z.enum(['active', 'disabled', 'locked']).default('active'),
  maxDiscountPercent: z.coerce.number().min(0).max(100).nullable().optional(),
});

const userIdSchema = z.coerce.number().int().positive();

const updateUserSchema = z.object({
  username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(128).optional().or(z.literal('')),
  displayName: z.string().trim().min(1).max(160),
  avatarUrl: optionalImage,
  roleId: z.coerce.number().int().positive(),
  status: z.enum(['active', 'disabled', 'locked']),
  maxDiscountPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  resetPermissionsToRole: z.boolean().optional(),
});

const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.coerce.number().int().positive()).default([]),
});

router.use(requireAuth);

router.get('/admin/users', requirePermission('auth.users.view'), asyncHandler(async (_req, res) => res.json({ items: await admin.users() })));
router.get(
  '/admin/users/:userId',
  requirePermission('auth.users.view'),
  asyncHandler(async (req, res) => {
    res.json({ user: await admin.user(userIdSchema.parse(req.params.userId)) });
  }),
);
router.post(
  '/admin/users',
  requirePermission('auth.users.manage'),
  asyncHandler(async (req, res) => {
    const body = createUserSchema.parse(req.body);
    const user = await admin.createUser({
      username: body.username,
      password: body.password,
      displayName: body.displayName,
      avatarUrl: body.avatarUrl,
      roleId: body.roleId,
      status: body.status,
      maxDiscountPercent: body.maxDiscountPercent,
      actorUserId: req.currentUser?.id,
      ipAddress: req.ip,
    });

    res.status(201).json({ user });
  }),
);
router.patch(
  '/admin/users/:userId',
  requirePermission('auth.users.manage'),
  asyncHandler(async (req, res) => {
    const body = updateUserSchema.parse(req.body);
    const user = await admin.updateUser(userIdSchema.parse(req.params.userId), {
      username: body.username,
      password: body.password || undefined,
      displayName: body.displayName,
      avatarUrl: body.avatarUrl,
      roleId: body.roleId,
      status: body.status,
      maxDiscountPercent: body.maxDiscountPercent,
      resetPermissionsToRole: body.resetPermissionsToRole,
      actorUserId: req.currentUser?.id,
      ipAddress: req.ip,
    });

    res.json({ user });
  }),
);
router.delete(
  '/admin/users/:userId',
  requirePermission('auth.users.manage'),
  asyncHandler(async (req, res) => {
    await admin.deleteUser(userIdSchema.parse(req.params.userId), {
      actorUserId: req.currentUser?.id,
      ipAddress: req.ip,
    });

    res.status(204).send();
  }),
);
router.put(
  '/admin/users/:userId/permissions',
  requirePermission('auth.permissions.manage'),
  asyncHandler(async (req, res) => {
    const body = updatePermissionsSchema.parse(req.body);
    const user = await admin.updateUserPermissions(userIdSchema.parse(req.params.userId), {
      permissionIds: body.permissionIds,
      actorUserId: req.currentUser?.id,
      ipAddress: req.ip,
    });

    res.json({ user });
  }),
);
router.post(
  '/admin/users/:userId/permissions/reset',
  requirePermission('auth.permissions.manage'),
  asyncHandler(async (req, res) => {
    const user = await admin.resetUserPermissions(userIdSchema.parse(req.params.userId), {
      actorUserId: req.currentUser?.id,
      ipAddress: req.ip,
    });

    res.json({ user });
  }),
);
router.get('/admin/roles', requirePermission('auth.users.view'), asyncHandler(async (_req, res) => res.json({ items: await admin.roles() })));
router.get('/admin/permissions', requirePermission('auth.permissions.manage'), asyncHandler(async (_req, res) => res.json({ items: await admin.permissions() })));
router.get('/admin/settings', requirePermission('auth.users.view'), asyncHandler(async (_req, res) => res.json({ settings: admin.settings() })));

export { router as adminRouter };
