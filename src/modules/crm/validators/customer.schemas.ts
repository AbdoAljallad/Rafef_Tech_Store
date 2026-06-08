import { z } from 'zod';

const requiredMessage = 'Обязательное поле';
const emailMessage = 'Введите корректный email';
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);
const optionalEmail = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().email().safeParse(value).success, emailMessage)
  .transform((value) => value || null);

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, requiredMessage),
  phonePrimary: optionalText,
  phoneSecondary: optionalText,
  email: optionalEmail,
  customerType: z.enum(['person', 'business']),
  notes: optionalText,
});

export const contactFormSchema = z.object({
  contactType: z.enum(['phone', 'email', 'whatsapp', 'telegram', 'other']),
  contactValue: z.string().trim().min(1, requiredMessage),
  isPrimary: z.boolean(),
});

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, requiredMessage),
  locationType: z.enum(['home', 'school', 'company', 'store', 'factory', 'hospital', 'other']),
  addressText: optionalText,
  mapUrl: optionalText,
  notes: optionalText,
});

export const noteFormSchema = z.object({
  noteText: z.string().trim().min(1, requiredMessage),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type LocationFormValues = z.infer<typeof locationFormSchema>;
export type NoteFormValues = z.infer<typeof noteFormSchema>;
