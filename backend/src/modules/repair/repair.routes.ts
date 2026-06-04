import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { parsePagination } from '../../shared/http/pagination.js';
import {
  brandSchema,
  deviceCategorySchema,
  deviceSchema,
  modelSchema,
  noteSchema,
  orderPartSchema,
  orderSchema,
  orderServiceSchema,
  statusChangeSchema,
} from './repair.schemas.js';
import { RepairService } from './repair.service.js';

const router = Router();
const repair = new RepairService();

router.use(requireAuth);

router.get('/repair/device-categories', requirePermission('repair.orders.view'), asyncHandler(async (_req, res) => res.json({ items: await repair.listCategories() })));
router.post('/repair/device-categories', requirePermission('repair.orders.create'), asyncHandler(async (req, res) => res.status(201).json({ category: await repair.createCategory(deviceCategorySchema.parse(req.body)) })));
router.get('/repair/brands', requirePermission('repair.orders.view'), asyncHandler(async (_req, res) => res.json({ items: await repair.listBrands() })));
router.post('/repair/brands', requirePermission('repair.orders.create'), asyncHandler(async (req, res) => res.status(201).json({ brand: await repair.createBrand(brandSchema.parse(req.body)) })));
router.get('/repair/models', requirePermission('repair.orders.view'), asyncHandler(async (_req, res) => res.json({ items: await repair.listModels() })));
router.post('/repair/models', requirePermission('repair.orders.create'), asyncHandler(async (req, res) => res.status(201).json({ model: await repair.createModel(modelSchema.parse(req.body)) })));
router.post('/repair/devices', requirePermission('repair.orders.create'), asyncHandler(async (req, res) => res.status(201).json({ device: await repair.createDevice(deviceSchema.parse(req.body)) })));

router.get('/repair/orders', requirePermission('repair.orders.view'), asyncHandler(async (req, res) => {
  const { pageSize, offset } = parsePagination(req.query);
  res.json({ items: await repair.listOrders({ offset, limit: pageSize }) });
}));
router.post('/repair/orders', requirePermission('repair.orders.create'), asyncHandler(async (req, res) => res.status(201).json({ order: await repair.createOrder(orderSchema.parse(req.body), req.currentUser!.id, req.ip) })));
router.get('/repair/orders/:id', requirePermission('repair.orders.view'), asyncHandler(async (req, res) => res.json({ order: await repair.getOrder(parseId(req.params.id)) })));
router.post('/repair/orders/:id/services', requirePermission('repair.orders.update'), asyncHandler(async (req, res) => res.status(201).json({ service: await repair.addService(parseId(req.params.id), orderServiceSchema.parse(req.body), req.currentUser!.id, req.ip) })));
router.post('/repair/orders/:id/parts', requirePermission('repair.parts.reserve'), asyncHandler(async (req, res) => res.status(201).json({ part: await repair.addPart(parseId(req.params.id), orderPartSchema.parse(req.body), req.currentUser!.id, req.ip) })));
router.post('/repair/orders/:id/status', requirePermission('repair.orders.update'), asyncHandler(async (req, res) => res.json({ order: await repair.changeStatus(parseId(req.params.id), statusChangeSchema.parse(req.body), req.currentUser!.id, req.ip) })));
router.post('/repair/orders/:id/notes', requirePermission('repair.orders.update'), asyncHandler(async (req, res) => res.status(201).json({ note: await repair.addNote(parseId(req.params.id), noteSchema.parse(req.body), req.currentUser!.id) })));
router.get('/repair/orders/:id/receipt', requirePermission('repair.orders.view'), asyncHandler(async (req, res) => res.json({ receipt: await repair.receipt(parseId(req.params.id)) })));

export { router as repairRouter };
