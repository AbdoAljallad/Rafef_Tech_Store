import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { parsePagination } from '../../shared/http/pagination.js';
import { adjustmentCreateSchema, purchaseCreateSchema, reservationCreateSchema } from './inventory.schemas.js';
import { PurchaseService } from './purchase.service.js';
import { StockAdjustmentService } from './stockAdjustment.service.js';
import { StockMovementService } from './stockMovement.service.js';
import { StockReservationService } from './stockReservation.service.js';
import { StockService } from './stock.service.js';

const router = Router();
const stockService = new StockService();
const stockMovementService = new StockMovementService();
const stockReservationService = new StockReservationService();
const purchaseService = new PurchaseService();
const stockAdjustmentService = new StockAdjustmentService();

router.use(requireAuth);

router.get(
  '/inventory/stock',
  requirePermission('inventory.stock.view'),
  asyncHandler(async (request, response) => {
    const { pageSize, offset } = parsePagination(request.query);
    const items = await stockService.listStock({
      search: typeof request.query.search === 'string' ? request.query.search : undefined,
      offset,
      limit: pageSize,
    });
    response.json({ items });
  }),
);

router.get(
  '/inventory/products/:id/movements',
  requirePermission('inventory.stock.view'),
  asyncHandler(async (request, response) => {
    const { pageSize, offset } = parsePagination(request.query);
    const items = await stockMovementService.listProductMovements(parseId(request.params.id), { offset, limit: pageSize });
    response.json({ items });
  }),
);

router.post(
  '/inventory/reservations',
  requirePermission('inventory.reservations.manage'),
  asyncHandler(async (request, response) => {
    const reservation = await stockReservationService.createReservation(
      reservationCreateSchema.parse(request.body),
      request.currentUser!.id,
      request.ip,
    );
    response.status(201).json({ reservation });
  }),
);

router.post(
  '/inventory/reservations/:id/consume',
  requirePermission('inventory.reservations.manage'),
  asyncHandler(async (request, response) => {
    const reservation = await stockReservationService.consumeReservation(parseId(request.params.id), request.currentUser!.id, request.ip);
    response.json({ reservation });
  }),
);

router.post(
  '/inventory/reservations/:id/release',
  requirePermission('inventory.reservations.manage'),
  asyncHandler(async (request, response) => {
    const reservation = await stockReservationService.releaseReservation(parseId(request.params.id), request.currentUser!.id, request.ip);
    response.json({ reservation });
  }),
);

router.post(
  '/inventory/adjustments',
  requirePermission('inventory.stock.adjust'),
  asyncHandler(async (request, response) => {
    const adjustment = await stockAdjustmentService.createAdjustment(
      adjustmentCreateSchema.parse(request.body),
      request.currentUser!.id,
      request.ip,
    );
    response.status(201).json({ adjustment });
  }),
);

router.post(
  '/inventory/purchases',
  requirePermission('inventory.purchases.manage'),
  asyncHandler(async (request, response) => {
    const purchase = await purchaseService.createPurchase(purchaseCreateSchema.parse(request.body), request.currentUser!.id);
    response.status(201).json({ purchase });
  }),
);

router.post(
  '/inventory/purchases/:id/receive',
  requirePermission('inventory.purchases.manage'),
  asyncHandler(async (request, response) => {
    const purchase = await purchaseService.receivePurchase(parseId(request.params.id), request.currentUser!.id, request.ip);
    response.json({ purchase });
  }),
);

export { router as inventoryRouter };
