import { z } from 'zod';

const idSchema = z.coerce.number().int().positive();
const quantitySchema = z.coerce.number().positive();
const moneySchema = z.coerce.number().min(0);
const optionalText = z.string().trim().optional().nullable();

export const reservationCreateSchema = z.object({
  productId: idSchema,
  quantity: quantitySchema,
  sourceType: z.string().trim().min(1),
  sourceId: idSchema,
  notes: optionalText,
});

export const adjustmentCreateSchema = z.object({
  reason: z.string().trim().min(1),
  notes: optionalText,
  lines: z.array(
    z.object({
      productId: idSchema,
      direction: z.enum(['in', 'out']),
      quantity: quantitySchema,
      unitCost: moneySchema.optional().nullable(),
      notes: optionalText,
    }),
  ).min(1),
});

export const purchaseCreateSchema = z.object({
  supplierId: idSchema.optional().nullable(),
  notes: optionalText,
  lines: z.array(
    z.object({
      productId: idSchema,
      quantity: quantitySchema,
      unitCost: moneySchema,
    }),
  ).min(1),
});

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
export type AdjustmentCreateInput = z.infer<typeof adjustmentCreateSchema>;
export type PurchaseCreateInput = z.infer<typeof purchaseCreateSchema>;
