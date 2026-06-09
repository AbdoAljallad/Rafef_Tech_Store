import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { getSessionToken, requireAuth } from './auth.middleware.js';
import { AuthService } from './auth.service.js';
const router = Router();
const authService = new AuthService();
const optionalImage = z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || value.startsWith('data:image/'), 'INVALID_IMAGE')
    .transform((value) => value || null);
const loginSchema = z.object({
    username: z.string().trim().min(1),
    password: z.string().min(1),
});
const profileUpdateSchema = z.object({
    username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9_.-]+$/),
    displayName: z.string().trim().min(1).max(160),
    avatarUrl: optionalImage,
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional().or(z.literal('')),
});
function sessionCookieOptions(expires) {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        expires,
    };
}
router.post('/login', asyncHandler(async (request, response) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login({
        username: body.username,
        password: body.password,
        ipAddress: request.ip,
        userAgent: request.get('user-agent') ?? null,
    });
    response.cookie(env.SESSION_COOKIE_NAME, result.rawSessionToken, sessionCookieOptions(result.expiresAt));
    response.json({
        user: result.user,
        accessToken: result.rawSessionToken,
    });
}));
router.post('/logout', asyncHandler(async (request, response) => {
    await authService.logout({
        rawSessionToken: getSessionToken(request),
        actorUserId: request.currentUser?.id,
        ipAddress: request.ip,
    });
    response.clearCookie(env.SESSION_COOKIE_NAME);
    response.status(204).send();
}));
router.get('/me', requireAuth, asyncHandler(async (request, response) => {
    response.json({
        user: request.currentUser,
    });
}));
router.get('/me/profile', requireAuth, asyncHandler(async (request, response) => {
    const profile = await authService.getOwnProfile(request.currentUser.id);
    response.json({ profile });
}));
router.patch('/me/profile', requireAuth, asyncHandler(async (request, response) => {
    const body = profileUpdateSchema.parse(request.body);
    const profile = await authService.updateOwnProfile(request.currentUser.id, {
        username: body.username,
        displayName: body.displayName,
        avatarUrl: body.avatarUrl,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword || undefined,
        ipAddress: request.ip,
    });
    response.json({ profile });
}));
export { router as authRouter };
