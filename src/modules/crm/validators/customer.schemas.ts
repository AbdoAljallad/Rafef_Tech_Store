import { z } from 'zod';

const requiredMessage = 'Обязательное поле';
const emailMessage = 'Введите корректный email';

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value || null);

const optionalImage = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => !value || value.startsWith('data:image/'), 'Загрузите корректное изображение')
  .transform((value) => value || null);

export const contactFormSchema = z
  .object({
    contactType: z.enum(['phone', 'email', 'whatsapp', 'telegram', 'other']),
    contactValue: z.string().trim().min(1, requiredMessage),
    isPrimary: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.contactType === 'email' && !z.string().email().safeParse(value.contactValue).success) {
      ctx.addIssue({
        code: 'custom',
        message: emailMessage,
        path: ['contactValue'],
      });
    }
  });

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, requiredMessage),
  avatarUrl: optionalImage,
  customerType: z.enum(['person', 'business']),
  notes: optionalText,
  contacts: z.array(contactFormSchema).max(20, 'Можно добавить не более 20 способов связи').default([]),
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
