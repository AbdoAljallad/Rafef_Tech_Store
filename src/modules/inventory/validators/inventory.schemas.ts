import { z } from 'zod';

const requiredId = z.coerce.number().int().positive('Выберите товар');
const quantity = z.coerce.number().positive('Количество должно быть больше нуля');
const money = z.coerce.number().min(0, 'Стоимость не может быть отрицательной');
const optionalText = z.string().trim().optional().transform((value) => value || null);
const optionalId = z.preprocess((value) => (value === '' ? null : value), z.coerce.number().int().positive().nullable().optional());

export const reservationFormSchema = z.object({
  productId: requiredId,
  quantity,
  sourceType: z.string().trim().min(1, 'Укажите тип источника'),
  sourceId: z.coerce.number().int().positive('Укажите ID источника'),
  notes: optionalText,
});

export const reservationActionSchema = z.object({
  reservationId: z.coerce.number().int().positive('Укажите ID резерва'),
});

export const purchaseFormSchema = z.object({
  supplierId: optionalId,
  productId: requiredId,
  quantity,
  unitCost: money,
  notes: optionalText,
});

export const receivePurchaseSchema = z.object({
  purchaseId: z.coerce.number().int().positive('Укажите ID закупки'),
});

export const adjustmentFormSchema = z.object({
  productId: requiredId,
  direction: z.enum(['in', 'out']),
  quantity,
  unitCost: money.optional().nullable(),
  reason: z.string().trim().min(1, 'Укажите причину корректировки'),
  notes: optionalText,
});

export type ReservationFormValues = z.infer<typeof reservationFormSchema>;
export type ReservationActionValues = z.infer<typeof reservationActionSchema>;
export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;
export type ReceivePurchaseValues = z.infer<typeof receivePurchaseSchema>;
export type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;
