import { z } from 'zod';

const optionalText = z.string().trim().optional().transform((value) => value || null);
const money = z.coerce.number().min(0, 'Значение не может быть отрицательным');

export const productFormSchema = z.object({
  categoryId: z.coerce.number().int().positive('Выберите категорию'),
  unitId: z.coerce.number().int().positive('Выберите единицу'),
  sku: z.string().trim().min(1, 'Обязательное поле'),
  defaultName: z.string().trim().min(1, 'Обязательное поле'),
  trackingType: z.enum(['quantity', 'serial', 'batch']),
  currentPurchasePrice: money,
  currentSalePrice: money,
  reorderThreshold: money,
  barcode: optionalText,
});

export const productEditSchema = productFormSchema.omit({ barcode: true });
export const priceChangeSchema = z.object({ newPurchasePrice: money, newSalePrice: money, reason: optionalText });
export const categoryFormSchema = z.object({
  code: z.string().trim().min(1, 'Обязательное поле'),
  defaultName: z.string().trim().min(1, 'Обязательное поле'),
  parentId: z.coerce.number().int().positive().optional().nullable(),
  showInSales: z.boolean(),
  showInRepair: z.boolean(),
  showInProjects: z.boolean(),
  showInCreative: z.boolean(),
});
export const supplierFormSchema = z.object({ name: z.string().trim().min(1, 'Обязательное поле'), phone: optionalText, email: optionalText, addressText: optionalText, notes: optionalText });
export type ProductFormValues = z.infer<typeof productFormSchema>;
export type ProductEditValues = z.infer<typeof productEditSchema>;
export type PriceChangeValues = z.infer<typeof priceChangeSchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
