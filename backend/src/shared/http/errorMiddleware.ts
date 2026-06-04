import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.status).json({
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
};
