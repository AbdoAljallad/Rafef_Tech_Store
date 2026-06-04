import { z } from 'zod';

const idSchema = z.coerce.number().int().positive();
const qtySchema = z.coerce.number().positive();
const moneySchema = z.coerce.number().min(0);
const optionalText = z.string().trim().optional().nullable();

export const invoiceCreateSchema = z.object({
  customerId: idSchema.optional().nullable(),
  isWalkIn: z.boolean().optional().default(true),
  lines: z.array(z.object({ productId: idSchema, quantity: qtySchema, unitPrice: moneySchema })).min(1),
});

export const invoiceLineSchema = z.object({ productId: idSchema, quantity: qtySchema, unitPrice: moneySchema });

export const invoiceApproveSchema = z.object({ approve: z.literal(true) });
export const invoiceVoidSchema = z.object({ reason: optionalText });

export const returnCreateSchema = z.object({ invoiceId: idSchema, lines: z.array(z.object({ productId: idSchema, quantity: qtySchema })).min(1) });

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type ReturnCreateInput = z.infer<typeof returnCreateSchema>;
