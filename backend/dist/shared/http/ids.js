import { AppError } from '../errors/AppError.js';
export function parseId(value, name = 'id') {
    if (Array.isArray(value)) {
        throw new AppError(400, 'VALIDATION_ERROR', `Invalid ${name}`);
    }
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(400, 'VALIDATION_ERROR', `Invalid ${name}`);
    }
    return id;
}
