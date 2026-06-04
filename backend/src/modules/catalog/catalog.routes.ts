import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { parsePagination } from '../../shared/http/pagination.js';
import { CatalogService } from './catalog.service.js';
import { categoryCreateSchema, priceChangeSchema, productCreateSchema, productUpdateSchema, supplierCreateSchema } from './catalog.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';

const router = Router();
const catalogService = new CatalogService();

router.use(requireAuth);

router.get(
  '/products',
  requirePermission('catalog.products.view'),
  asyncHandler(async (request, response) => {
    const { pageSize, offset } = parsePagination(request.query);
    const products = await catalogService.listProducts({
      search: typeof request.query.search === 'string' ? request.query.search : undefined,
      offset,
      limit: pageSize,
    });
    response.json({ items: products });
  }),
);

router.post(
  '/products',
  requirePermission('catalog.products.manage'),
  asyncHandler(async (request, response) => {
    const product = await catalogService.createProduct(productCreateSchema.parse(request.body), request.currentUser!.id, request.ip);
    response.status(201).json({ product });
  }),
);

router.get(
  '/products/:id',
  requirePermission('catalog.products.view'),
  asyncHandler(async (request, response) => {
    const product = await catalogService.getProduct(parseId(request.params.id));
    response.json({ product });
  }),
);

router.patch(
  '/products/:id',
  requirePermission('catalog.products.manage'),
  asyncHandler(async (request, response) => {
    const product = await catalogService.updateProduct(
      parseId(request.params.id),
      productUpdateSchema.parse(request.body),
      request.currentUser!.id,
      request.ip,
    );
    response.json({ product });
  }),
);

router.post(
  '/products/:id/price-change',
  requirePermission('catalog.prices.change'),
  asyncHandler(async (request, response) => {
    const product = await catalogService.changePrice(
      parseId(request.params.id),
      priceChangeSchema.parse(request.body),
      request.currentUser!.id,
      request.ip,
    );
    response.json({ product });
  }),
);

router.get(
  '/barcodes/:barcode/product',
  requirePermission('catalog.products.view'),
  asyncHandler(async (request, response) => {
    const barcode = request.params.barcode;
    if (!barcode || Array.isArray(barcode)) throw new AppError(400, 'VALIDATION_ERROR', 'Barcode is required');
    const product = await catalogService.getProductByBarcode(barcode);
    response.json({ product });
  }),
);

router.get(
  '/categories',
  requirePermission('catalog.products.view'),
  asyncHandler(async (_request, response) => {
    response.json({ items: await catalogService.listCategories() });
  }),
);

router.post(
  '/categories',
  requirePermission('catalog.products.manage'),
  asyncHandler(async (request, response) => {
    response.status(201).json({ category: await catalogService.createCategory(categoryCreateSchema.parse(request.body)) });
  }),
);

router.get(
  '/units',
  requirePermission('catalog.products.view'),
  asyncHandler(async (_request, response) => {
    response.json({ items: await catalogService.listUnits() });
  }),
);

router.get(
  '/services',
  requirePermission('catalog.products.view'),
  asyncHandler(async (request, response) => {
    response.json({
      items: await catalogService.listServices(typeof request.query.module === 'string' ? request.query.module : undefined),
    });
  }),
);

router.post(
  '/suppliers',
  requirePermission('catalog.suppliers.manage'),
  asyncHandler(async (request, response) => {
    const supplier = await catalogService.createSupplier(supplierCreateSchema.parse(request.body), request.currentUser!.id, request.ip);
    response.status(201).json({ supplier });
  }),
);

export { router as catalogRouter };
