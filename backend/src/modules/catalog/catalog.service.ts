import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { CatalogRepository } from './catalog.repository.js';
import type { CategoryCreateInput, PriceChangeInput, ProductCreateInput, ProductUpdateInput, SupplierCreateInput } from './catalog.schemas.js';

function isDuplicateKey(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';
}

export class CatalogService {
  constructor(
    private readonly catalogRepository = new CatalogRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  listProducts(params: { search?: string; offset: number; limit: number }) {
    return this.catalogRepository.listProducts(params);
  }

  async getProduct(id: number) {
    const product = await this.catalogRepository.findProductById(id);
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
    return product;
  }

  async createProduct(input: ProductCreateInput, actorUserId: number, ipAddress?: string | null) {
    try {
      const product = await this.catalogRepository.createProduct(input, actorUserId);
      if (!product) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create product');
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
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'STATE_CONFLICT', 'Product SKU or barcode already exists');
      }
      throw error;
    }
  }

  async updateProduct(id: number, input: ProductUpdateInput, actorUserId: number, ipAddress?: string | null) {
    const before = await this.getProduct(id);
    try {
      const product = await this.catalogRepository.updateProduct(id, input, actorUserId);
      if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
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
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'STATE_CONFLICT', 'Product SKU already exists');
      }
      throw error;
    }
  }

  async changePrice(id: number, input: PriceChangeInput, actorUserId: number, ipAddress?: string | null) {
    const product = await this.catalogRepository.changePrice(id, input, actorUserId);
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
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

  async getProductByBarcode(barcode: string) {
    const product = await this.catalogRepository.findProductByBarcode(barcode);
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
    return product;
  }

  listCategories() {
    return this.catalogRepository.listCategories();
  }

  createCategory(input: CategoryCreateInput) {
    return this.catalogRepository.createCategory(input);
  }

  listUnits() {
    return this.catalogRepository.listUnits();
  }

  listServices(module?: string) {
    return this.catalogRepository.listServices(module);
  }

  async createSupplier(input: SupplierCreateInput, actorUserId: number, ipAddress?: string | null) {
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
}
