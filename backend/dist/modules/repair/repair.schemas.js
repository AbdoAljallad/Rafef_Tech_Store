import { z } from 'zod';
const id = z.coerce.number().int().positive();
const money = z.coerce.number().min(0);
const qty = z.coerce.number().positive();
const text = z.string().trim().min(1);
const optionalText = z.string().trim().optional().nullable();
export const repairStatusSchema = z.enum([
    'new',
    'inspection',
    'waiting_customer_approval',
    'waiting_part',
    'in_repair',
    'ready_for_delivery',
    'delivered',
    'cancelled',
]);
export const deviceCategorySchema = z.object({ code: text, nameRu: text });
export const brandSchema = z.object({ name: text });
export const modelSchema = z.object({ categoryId: id, brandId: id, name: text });
export const deviceSchema = z.object({
    customerId: id,
    categoryId: id,
    brandId: id.optional().nullable(),
    modelId: id.optional().nullable(),
    deviceName: text,
    serialNo: optionalText,
    imei: optionalText,
    notes: optionalText,
});
export const orderSchema = z.object({
    customerId: id,
    deviceId: id,
    problemDescription: text,
    intakeNotes: optionalText,
    assignedUserId: id.optional().nullable(),
});
export const orderServiceSchema = z.object({
    serviceId: id.optional().nullable(),
    serviceName: text.optional(),
    quantity: qty,
    unitPrice: money.optional(),
});
export const orderPartSchema = z.object({ productId: id, quantity: qty });
export const statusChangeSchema = z.object({ status: repairStatusSchema, note: optionalText });
export const noteSchema = z.object({ noteText: text });
