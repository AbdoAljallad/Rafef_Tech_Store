import { z } from 'zod';

const optionalText = z.string().trim().optional().transform((value) => value || null);

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Обязательное поле'),
  phonePrimary: optionalText,
  phoneSecondary: optionalText,
  email: z.string().trim().optional().transform((value) => value || null),
  customerType: z.enum(['person', 'business']),
  notes: optionalText,
});

export const contactFormSchema = z.object({
  contactType: z.enum(['phone', 'email', 'whatsapp', 'telegram', 'other']),
  contactValue: z.string().trim().min(1, 'Обязательное поле'),
  isPrimary: z.boolean(),
});

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, 'Обязательное поле'),
  locationType: z.enum(['home', 'school', 'company', 'store', 'factory', 'hospital', 'other']),
  addressText: optionalText,
  mapUrl: optionalText,
  notes: optionalText,
});

export const noteFormSchema = z.object({
  noteText: z.string().trim().min(1, 'Обязательное поле'),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type LocationFormValues = z.infer<typeof locationFormSchema>;
export type NoteFormValues = z.infer<typeof noteFormSchema>;
