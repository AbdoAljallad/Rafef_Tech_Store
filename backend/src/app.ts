import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { crmRouter } from './modules/crm/crm.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { repairRouter } from './modules/repair/repair.routes.js';
import { salesRouter } from './modules/sales/sales.routes.js';
import { financeRouter } from './modules/finance/finance.routes.js';
import { creativeRouter } from './modules/creative/creative.routes.js';
import { projectsRouter } from './modules/projects/projects.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { integrationsRouter } from './modules/integrations/integrations.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { errorMiddleware } from './shared/http/errorMiddleware.js';

function getAllowedOrigins() {
  const origins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV === 'development') {
    origins.push('http://localhost:5173', 'http://127.0.0.1:5173', 'http://172.18.0.1:5173', 'http://169.254.83.107:5173', 'http://host.docker.internal:5173', 'http://172.18.96.1:5173', 'http://172.28.0.1:5173', 'http://192.168.1.100:5173');
  }

  return new Set(origins);
}

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', crmRouter);
  app.use('/api', catalogRouter);
  app.use('/api', inventoryRouter);
  app.use('/api', repairRouter);
  app.use('/api', salesRouter);
  app.use('/api', financeRouter);
  app.use('/api', creativeRouter);
  app.use('/api', projectsRouter);
  app.use('/api', reportsRouter);
  app.use('/api', integrationsRouter);
  app.use('/api', aiRouter);
  app.use('/api', adminRouter);

  app.use(errorMiddleware);

  return app;
}
