import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../database/mysql.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';

type EventRow = RowDataPacket & {
  id: number;
  module: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: number | null;
  severity: 'info' | 'important' | 'urgent' | 'critical';
  created_at: Date | string;
};

const router = Router();

router.use(requireAuth);

function getLinkPath(event: EventRow) {
  if (event.module === 'repair' && event.entity_type === 'repair_order' && event.entity_id) {
    return `/repair/orders/${event.entity_id}`;
  }

  if (event.module === 'sales' && event.entity_type === 'sales_invoice' && event.entity_id) {
    return `/sales/invoices/${event.entity_id}`;
  }

  if (event.module === 'crm' && event.entity_type === 'customer' && event.entity_id) {
    return `/customers/${event.entity_id}`;
  }

  if (event.module === 'inventory') {
    return '/inventory/stock';
  }

  if (event.module === 'projects' && event.entity_type === 'project' && event.entity_id) {
    return `/projects/${event.entity_id}`;
  }

  return '/events';
}

function formatCreatedAt(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

router.get(
  '/events/ticker',
  requirePermission('events.view'),
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<EventRow[]>(
      `SELECT id, module, title, message, entity_type, entity_id, severity, created_at
       FROM app_events
       ORDER BY created_at DESC, id DESC
       LIMIT 20`,
    );

    response.json({
      items: rows.map((event) => ({
        id: Number(event.id),
        messageRu: event.message ? `${event.title} - ${event.message}` : event.title,
        severity: event.severity === 'info' ? 'normal' : event.severity,
        module: event.module,
        linkPath: getLinkPath(event),
        createdAt: formatCreatedAt(event.created_at),
      })),
    });
  }),
);

export { router as eventsRouter };
