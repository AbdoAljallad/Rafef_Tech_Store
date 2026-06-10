import { z } from 'zod';

const idSchema = z.coerce.number().int().positive();
const qtySchema = z.coerce.number().positive();
const moneySchema = z.coerce.number().min(0);
const optionalText = z.string().trim().optional().nullable();
const documentTypeSchema = z.enum(['invoice', 'quote']);
const invoiceStatusSchema = z.enum(['draft', 'approved', 'voided', 'returned']);
const dateFilterSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

const productInvoiceLineSchema = z.object({
  lineType: z.literal('product').optional().default('product'),
  productId: idSchema,
  quantity: qtySchema,
  unitPrice: moneySchema,
});

const repairServiceInvoiceLineSchema = z.object({
  lineType: z.literal('repair_service'),
  repairOrderServiceId: idSchema,
  quantity: qtySchema.optional(),
  unitPrice: moneySchema.optional(),
});

const repairPartInvoiceLineSchema = z.object({
  lineType: z.literal('repair_part'),
  repairOrderPartId: idSchema,
  quantity: qtySchema.optional(),
  unitPrice: moneySchema.optional(),
});

export const invoiceLineSchema = z.union([
  productInvoiceLineSchema,
  repairServiceInvoiceLineSchema,
  repairPartInvoiceLineSchema,
]);

export const invoiceCreateSchema = z.object({
  customerId: idSchema.optional().nullable(),
  repairOrderId: idSchema.optional().nullable(),
  isWalkIn: z.boolean().optional().default(true),
  documentType: documentTypeSchema.optional().default('invoice'),
  noteText: optionalText,
  a4HeaderText: optionalText,
  a4FooterText: optionalText,
  receiptHeaderText: optionalText,
  receiptFooterText: optionalText,
  lines: z.array(invoiceLineSchema).min(1),
});

export const invoiceUpdateSchema = z.object({
  noteText: optionalText,
  a4HeaderText: optionalText,
  a4FooterText: optionalText,
  receiptHeaderText: optionalText,
  receiptFooterText: optionalText,
});
export const invoiceListQuerySchema = z.object({
  search: z.string().trim().optional(),
  documentType: documentTypeSchema.optional(),
  status: invoiceStatusSchema.optional(),
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
}).passthrough();

export const invoiceApproveSchema = z.object({ approve: z.literal(true) });
export const invoiceVoidSchema = z.object({ reason: optionalText });

export const returnCreateSchema = z.object({ invoiceId: idSchema, lines: z.array(z.object({ productId: idSchema, quantity: qtySchema })).min(1) });

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type ReturnCreateInput = z.infer<typeof returnCreateSchema>;
export type InvoiceDocumentType = z.infer<typeof documentTypeSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type InvoiceListQueryInput = z.infer<typeof invoiceListQuerySchema>;
export type InvoiceLineType = NonNullable<InvoiceLineInput['lineType']>;
