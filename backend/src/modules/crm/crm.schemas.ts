import { z } from 'zod';

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1),
  phonePrimary: z.string().trim().optional().nullable(),
  phoneSecondary: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  customerType: z.enum(['person', 'business']).default('person'),
  notes: z.string().trim().optional().nullable(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const contactCreateSchema = z.object({
  contactType: z.enum(['phone', 'email', 'whatsapp', 'telegram', 'other']),
  contactValue: z.string().trim().min(1),
  isPrimary: z.boolean().default(false),
});

export const locationCreateSchema = z.object({
  name: z.string().trim().min(1),
  locationType: z.enum(['home', 'school', 'company', 'store', 'factory', 'hospital', 'other']).default('other'),
  addressText: z.string().trim().optional().nullable(),
  mapUrl: z.string().trim().url().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const noteCreateSchema = z.object({
  noteText: z.string().trim().min(1),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type LocationCreateInput = z.infer<typeof locationCreateSchema>;
export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
