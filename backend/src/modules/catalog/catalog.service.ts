import { AppError } from '../../shared/errors/AppError.js';
import { EntityTranslationService } from '../../shared/localization/entityTranslation.service.js';
import type { UiLanguage } from '../../shared/localization/language.js';
import { AuditService } from '../audit/audit.service.js';
import { CatalogRepository } from './catalog.repository.js';
import type {
  CategoryCreateInput,
  PriceChangeInput,
  ProductCreateInput,
  ProductSupplierLinkInput,
  ProductUpdateInput,
  SupplierCreateInput,
} from './catalog.schemas.js';

function isDuplicateKey(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';
}

export class CatalogService {
  constructor(
    private readonly catalogRepository = new CatalogRepository(),
    private readonly auditService = new AuditService(),
    private readonly translationService = new EntityTranslationService(),
  ) {}

  listProducts(params: { search?: string; offset: number; limit: number; language?: UiLanguage }) {
    return this.catalogRepository.listProducts(params);
  }

  async getProduct(id: number, language?: UiLanguage) {
    const product = await this.catalogRepository.findProductById(id, language);
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
    return product;
  }

  async createProduct(input: ProductCreateInput, actorUserId: number, ipAddress?: string | null, language?: UiLanguage) {
    try {
      const product = await this.catalogRepository.createProduct(input, actorUserId, language);
      if (!product) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create product');
      await this.translationService.syncEntityField({
        entityType: 'catalog_products',
        entityId: product.id,
        fieldName: 'default_name',
        text: input.defaultName,
        requestedLanguage: language,
      });
      await this.auditService.log({
        actorUserId,
        actionCode: 'catalog.product.created',
        module: 'catalog',
        entityType: 'catalog_products',
        entityId: product.id,
        newValues: input,
        ipAddress,
      });
      return this.getProduct(product.id, language);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'STATE_CONFLICT', 'Product SKU or barcode already exists');
      }
      throw error;
    }
  }

  async updateProduct(id: number, input: ProductUpdateInput, actorUserId: number, ipAddress?: string | null, language?: UiLanguage) {
    const before = await this.getProduct(id, language);
    try {
      const product = await this.catalogRepository.updateProduct(id, input, actorUserId, language);
      if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
      if (input.defaultName) {
        await this.translationService.syncEntityField({
          entityType: 'catalog_products',
          entityId: id,
          fieldName: 'default_name',
          text: input.defaultName,
          requestedLanguage: language,
        });
      }
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
      return this.getProduct(id, language);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'STATE_CONFLICT', 'Product SKU already exists');
      }
      throw error;
    }
  }

  async changePrice(id: number, input: PriceChangeInput, actorUserId: number, ipAddress?: string | null, language?: UiLanguage) {
    const product = await this.catalogRepository.changePrice(id, input, actorUserId, language);
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

  async getProductByBarcode(barcode: string, language?: UiLanguage) {
    const product = await this.catalogRepository.findProductByBarcode(barcode, language);
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
    return product;
  }

  listCategories(language?: UiLanguage) {
    return this.catalogRepository.listCategories(language);
  }

  async createCategory(input: CategoryCreateInput, language?: UiLanguage) {
    const category = await this.catalogRepository.createCategory(input);
    await this.translationService.syncEntityField({
      entityType: 'catalog_categories',
      entityId: Number(category?.id),
      fieldName: 'default_name',
      text: input.defaultName,
      requestedLanguage: language,
    });
    return category;
  }

  listUnits() {
    return this.catalogRepository.listUnits();
  }

  listServices(module?: string, language?: UiLanguage) {
    return this.catalogRepository.listServices(module, language);
  }

  listSuppliers(language?: UiLanguage) {
    return this.catalogRepository.listSuppliers(language);
  }

  async createSupplier(input: SupplierCreateInput, actorUserId: number, ipAddress?: string | null, language?: UiLanguage) {
    const supplier = await this.catalogRepository.createSupplier(input, actorUserId, language);
    await this.translationService.syncEntityField({
      entityType: 'catalog_suppliers',
      entityId: Number(supplier?.id),
      fieldName: 'name',
      text: input.name,
      requestedLanguage: language,
    });
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

  async listProductSuppliers(productId: number, language?: UiLanguage) {
    await this.getProduct(productId, language);
    return this.catalogRepository.listProductSuppliers(productId, language);
  }

  async replaceProductSuppliers(productId: number, suppliers: ProductSupplierLinkInput[], actorUserId: number, ipAddress?: string | null, language?: UiLanguage) {
    await this.getProduct(productId, language);
    await this.catalogRepository.replaceProductSuppliers(productId, suppliers);
    await this.auditService.log({
      actorUserId,
      actionCode: 'catalog.product.suppliers_updated',
      module: 'catalog',
      entityType: 'catalog_product_suppliers',
      entityId: productId,
      newValues: suppliers,
      ipAddress,
    });
    return this.catalogRepository.listProductSuppliers(productId, language);
  }
}
