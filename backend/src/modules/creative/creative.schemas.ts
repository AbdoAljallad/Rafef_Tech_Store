import { z } from 'zod';

const id = z.coerce.number().int().positive();
const money = z.coerce.number();

export const jobTypeCreateSchema = z.object({ code: z.string().min(1), defaultName: z.string().min(1) });

export const vendorCreateSchema = z.object({ code: z.string().min(1), name: z.string().min(1), contact: z.any().optional() });

export const jobCreateSchema = z.object({ jobTypeId: id.optional().nullable(), title: z.string().min(1), description: z.string().optional().nullable(), deadlineAt: z.string().optional().nullable() });

export const jobLineCreateSchema = z.object({ jobId: id, lineType: z.string().optional().nullable(), description: z.string().optional().nullable(), quantity: money.optional().default(1), unitPrice: money.optional().nullable() });

export const vendorTaskCreateSchema = z.object({ vendorId: id, jobId: id, externalTaskCode: z.string().optional().nullable(), notes: z.string().optional().nullable() });

export const statusChangeSchema = z.object({ toStatus: z.string().min(1), notes: z.string().optional().nullable() });
