import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { getSessionToken, requireAuth } from './auth.middleware.js';
import { AuthService } from './auth.service.js';

const router = Router();
const authService = new AuthService();

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    expires,
  };
}

router.post(
  '/login',
  asyncHandler(async (request, response) => {
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
  }),
);

router.post(
  '/logout',
  asyncHandler(async (request, response) => {
    await authService.logout({
      rawSessionToken: getSessionToken(request),
      actorUserId: request.currentUser?.id,
      ipAddress: request.ip,
    });

    response.clearCookie(env.SESSION_COOKIE_NAME);
    response.status(204).send();
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (request, response) => {
    response.json({
      user: request.currentUser,
    });
  }),
);

export { router as authRouter };
