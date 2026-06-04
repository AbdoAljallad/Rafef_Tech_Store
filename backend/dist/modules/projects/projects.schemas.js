import { z } from 'zod';
const id = z.coerce.number().int().positive();
const quantity = z.coerce.number().positive();
const optionalText = z.string().trim().optional().nullable();
export const projectStatusSchema = z.enum(['draft', 'planned', 'in_progress', 'on_hold', 'completed', 'cancelled']);
export const projectTypeSchema = z.object({
    code: z.string().trim().min(1),
    defaultName: z.string().trim().min(1),
    description: optionalText,
});
export const projectCreateSchema = z.object({
    projectTypeId: id.optional().nullable(),
    customerId: id.optional().nullable(),
    title: z.string().trim().min(1),
    description: optionalText,
    plannedStartAt: z.string().trim().optional().nullable(),
    plannedEndAt: z.string().trim().optional().nullable(),
    assignedUserId: id.optional().nullable(),
});
export const projectSiteSchema = z.object({
    siteName: z.string().trim().min(1),
    addressText: optionalText,
    locationNotes: optionalText,
    contactName: optionalText,
    contactPhone: optionalText,
});
export const projectStatusChangeSchema = z.object({
    status: projectStatusSchema,
    stageCode: z.string().trim().optional().nullable(),
    notes: optionalText,
});
export const projectMaterialSchema = z.object({
    productId: id,
    quantity,
    notes: optionalText,
});
export const installedAssetSchema = z.object({
    siteId: id.optional().nullable(),
    productId: id.optional().nullable(),
    assetType: z.string().trim().min(1),
    assetName: z.string().trim().min(1),
    serialNo: optionalText,
    ipAddress: optionalText,
    macAddress: optionalText,
    installationNotes: optionalText,
    installedAt: z.string().trim().optional().nullable(),
});
export const projectNoteSchema = z.object({
    noteText: z.string().trim().min(1),
});
