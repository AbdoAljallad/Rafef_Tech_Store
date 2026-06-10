import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { CatalogRepository } from './catalog.repository.js';
function isDuplicateKey(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';
}
export class CatalogService {
    catalogRepository;
    auditService;
    constructor(catalogRepository = new CatalogRepository(), auditService = new AuditService()) {
        this.catalogRepository = catalogRepository;
        this.auditService = auditService;
    }
    listProducts(params) {
        return this.catalogRepository.listProducts(params);
    }
    async getProduct(id) {
        const product = await this.catalogRepository.findProductById(id);
        if (!product)
            throw new AppError(404, 'NOT_FOUND', 'Product not found');
        return product;
    }
    async createProduct(input, actorUserId, ipAddress) {
        try {
            const product = await this.catalogRepository.createProduct(input, actorUserId);
            if (!product)
                throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create product');
            await this.auditService.log({
                actorUserId,
                actionCode: 'catalog.product.created',
                module: 'catalog',
                entityType: 'catalog_products',
                entityId: product.id,
                newValues: input,
                ipAddress,
            });
            return product;
        }
        catch (error) {
            if (isDuplicateKey(error)) {
                throw new AppError(409, 'STATE_CONFLICT', 'Product SKU or barcode already exists');
            }
            throw error;
        }
    }
    async updateProduct(id, input, actorUserId, ipAddress) {
        const before = await this.getProduct(id);
        try {
            const product = await this.catalogRepository.updateProduct(id, input, actorUserId);
            if (!product)
                throw new AppError(404, 'NOT_FOUND', 'Product not found');
            await this.auditService.log({
                actorUserId,
                actionCode: 'catalog.product.updated',
                module: 'catalog',
                entityType: 'catalog_products',
                entityId: id,
                oldValues: before,
                newValues: input,
                ipAddress,
            });
            return product;
        }
        catch (error) {
            if (isDuplicateKey(error)) {
                throw new AppError(409, 'STATE_CONFLICT', 'Product SKU already exists');
            }
            throw error;
        }
    }
    async changePrice(id, input, actorUserId, ipAddress) {
        const product = await this.catalogRepository.changePrice(id, input, actorUserId);
        if (!product)
            throw new AppError(404, 'NOT_FOUND', 'Product not found');
        await this.auditService.log({
            actorUserId,
            actionCode: 'catalog.product.price_changed',
            module: 'catalog',
            entityType: 'catalog_products',
            entityId: id,
            newValues: input,
            ipAddress,
        });
        return product;
    }
    async getProductByBarcode(barcode) {
        const product = await this.catalogRepository.findProductByBarcode(barcode);
        if (!product)
            throw new AppError(404, 'NOT_FOUND', 'Product not found');
        return product;
    }
    listCategories() {
        return this.catalogRepository.listCategories();
    }
    createCategory(input) {
        return this.catalogRepository.createCategory(input);
    }
    listUnits() {
        return this.catalogRepository.listUnits();
    }
    listServices(module) {
        return this.catalogRepository.listServices(module);
    }
    listSuppliers() {
        return this.catalogRepository.listSuppliers();
    }
    async createSupplier(input, actorUserId, ipAddress) {
        const supplier = await this.catalogRepository.createSupplier(input, actorUserId);
        await this.auditService.log({
            actorUserId,
            actionCode: 'catalog.supplier.created',
            module: 'catalog',
            entityType: 'catalog_suppliers',
            entityId: Number(supplier?.id),
            newValues: input,
            ipAddress,
        });
        return supplier;
    }
    async listProductSuppliers(productId) {
        await this.getProduct(productId);
        return this.catalogRepository.listProductSuppliers(productId);
    }
    async replaceProductSuppliers(productId, suppliers, actorUserId, ipAddress) {
        await this.getProduct(productId);
        const updated = await this.catalogRepository.replaceProductSuppliers(productId, suppliers);
        await this.auditService.log({
            actorUserId,
            actionCode: 'catalog.product.suppliers_updated',
            module: 'catalog',
            entityType: 'catalog_product_suppliers',
            entityId: productId,
            newValues: suppliers,
            ipAddress,
        });
        return updated;
    }
}
