import { z } from 'zod';

const moneySchema = z.coerce.number().min(0);

export const productCreateSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  unitId: z.coerce.number().int().positive(),
  sku: z.string().trim().min(1),
  defaultName: z.string().trim().min(1),
  trackingType: z.enum(['quantity', 'serial', 'batch']).default('quantity'),
  currentPurchasePrice: moneySchema.default(0),
  currentSalePrice: moneySchema.default(0),
  reorderThreshold: moneySchema.default(0),
  barcode: z.string().trim().optional().nullable(),
});

export const productUpdateSchema = productCreateSchema.omit({ sku: true, barcode: true }).partial().extend({
  sku: z.string().trim().min(1).optional(),
});

export const priceChangeSchema = z.object({
  newPurchasePrice: moneySchema,
  newSalePrice: moneySchema,
  reason: z.string().trim().optional().nullable(),
});

export const categoryCreateSchema = z.object({
  parentId: z.coerce.number().int().positive().optional().nullable(),
  code: z.string().trim().min(1),
  defaultName: z.string().trim().min(1),
  showInSales: z.boolean().default(true),
  showInRepair: z.boolean().default(false),
  showInProjects: z.boolean().default(false),
  showInCreative: z.boolean().default(false),
});

export const supplierCreateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  addressText: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type PriceChangeInput = z.infer<typeof priceChangeSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
