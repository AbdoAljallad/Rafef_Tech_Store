import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { pingDatabase } from '../../database/mysql.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_request, response) => {
    await pingDatabase();
    response.json({
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),
);

export { router as healthRouter };
