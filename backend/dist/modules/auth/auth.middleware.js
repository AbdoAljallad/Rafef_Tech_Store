import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuthService } from './auth.service.js';
const authService = new AuthService();
export async function requireAuth(request, _response, next) {
    try {
        const token = getSessionToken(request);
        const current = await authService.getCurrentUser(token);
        request.currentUser = current.user;
        request.sessionId = current.sessionId;
        next();
    }
    catch (error) {
        next(error);
    }
}
export function getSessionToken(request) {
    const bearerHeader = request.headers.authorization;
    if (bearerHeader?.startsWith('Bearer ')) {
        return bearerHeader.slice('Bearer '.length);
    }
    const cookieToken = request.cookies?.[env.SESSION_COOKIE_NAME];
    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
        return cookieToken;
    }
    return '';
}
export function requirePermission(permissionCode) {
    return (request, _response, next) => {
        if (!request.currentUser) {
            next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required'));
            return;
        }
        if (!request.currentUser.permissions.includes(permissionCode)) {
            next(new AppError(403, 'PERMISSION_DENIED', 'Permission denied', { permissionCode }));
            return;
        }
        next();
    };
}
