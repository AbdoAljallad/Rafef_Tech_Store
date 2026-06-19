import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { parsePagination } from '../../shared/http/pagination.js';
import { CatalogService } from './catalog.service.js';
import { categoryCreateSchema, priceChangeSchema, productCreateSchema, productSuppliersUpdateSchema, productUpdateSchema, supplierCreateSchema, } from './catalog.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';
import { resolveRequestLanguage } from '../../shared/localization/requestLanguage.js';
const router = Router();
const catalogService = new CatalogService();
router.use(requireAuth);
router.get('/products', requirePermission('catalog.products.view'), asyncHandler(async (request, response) => {
    const { pageSize, offset } = parsePagination(request.query);
    const products = await catalogService.listProducts({
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
        offset,
        limit: pageSize,
        language: resolveRequestLanguage(request),
    });
    response.json({ items: products });
}));
router.post('/products', requirePermission('catalog.products.manage'), asyncHandler(async (request, response) => {
    const product = await catalogService.createProduct(productCreateSchema.parse(request.body), request.currentUser.id, request.ip, resolveRequestLanguage(request));
    response.status(201).json({ product });
}));
router.get('/products/:id', requirePermission('catalog.products.view'), asyncHandler(async (request, response) => {
    const product = await catalogService.getProduct(parseId(request.params.id), resolveRequestLanguage(request));
    response.json({ product });
}));
router.patch('/products/:id', requirePermission('catalog.products.manage'), asyncHandler(async (request, response) => {
    const product = await catalogService.updateProduct(parseId(request.params.id), productUpdateSchema.parse(request.body), request.currentUser.id, request.ip, resolveRequestLanguage(request));
    response.json({ product });
}));
router.post('/products/:id/price-change', requirePermission('catalog.prices.change'), asyncHandler(async (request, response) => {
    const product = await catalogService.changePrice(parseId(request.params.id), priceChangeSchema.parse(request.body), request.currentUser.id, request.ip, resolveRequestLanguage(request));
    response.json({ product });
}));
router.get('/barcodes/:barcode/product', requirePermission('catalog.products.view'), asyncHandler(async (request, response) => {
    const barcode = request.params.barcode;
    if (!barcode || Array.isArray(barcode))
        throw new AppError(400, 'VALIDATION_ERROR', 'Barcode is required');
    const product = await catalogService.getProductByBarcode(barcode, resolveRequestLanguage(request));
    response.json({ product });
}));
router.get('/categories', requirePermission('catalog.products.view'), asyncHandler(async (request, response) => {
    response.json({ items: await catalogService.listCategories(resolveRequestLanguage(request)) });
}));
router.post('/categories', requirePermission('catalog.products.manage'), asyncHandler(async (request, response) => {
    response.status(201).json({
        category: await catalogService.createCategory(categoryCreateSchema.parse(request.body), resolveRequestLanguage(request)),
    });
}));
router.get('/suppliers', requirePermission('catalog.products.view'), asyncHandler(async (request, response) => {
    response.json({ items: await catalogService.listSuppliers(resolveRequestLanguage(request)) });
}));
router.get('/units', requirePermission('catalog.products.view'), asyncHandler(async (_request, response) => {
    response.json({ items: await catalogService.listUnits() });
}));
router.get('/services', requirePermission('catalog.products.view'), asyncHandler(async (request, response) => {
    response.json({
        items: await catalogService.listServices(typeof request.query.module === 'string' ? request.query.module : undefined, resolveRequestLanguage(request)),
    });
}));
router.post('/suppliers', requirePermission('catalog.suppliers.manage'), asyncHandler(async (request, response) => {
    const supplier = await catalogService.createSupplier(supplierCreateSchema.parse(request.body), request.currentUser.id, request.ip, resolveRequestLanguage(request));
    response.status(201).json({ supplier });
}));
router.get('/products/:id/suppliers', requirePermission('catalog.products.view'), asyncHandler(async (request, response) => {
    response.json({ items: await catalogService.listProductSuppliers(parseId(request.params.id), resolveRequestLanguage(request)) });
}));
router.put('/products/:id/suppliers', requirePermission('catalog.products.manage'), asyncHandler(async (request, response) => {
    const payload = productSuppliersUpdateSchema.parse(request.body);
    response.json({
        items: await catalogService.replaceProductSuppliers(parseId(request.params.id), payload.suppliers, request.currentUser.id, request.ip, resolveRequestLanguage(request)),
    });
}));
export { router as catalogRouter };
