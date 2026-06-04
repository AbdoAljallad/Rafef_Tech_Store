import { z } from 'zod';

const idSchema = z.coerce.number().int().positive();
const moneySchema = z.coerce.number().min(0);
const optionalText = z.string().trim().optional().nullable();

export const paymentAccountCreateSchema = z.object({ code: z.string().min(1), name: z.string().min(1), type: z.string().optional() });
export const paymentMethodCreateSchema = z.object({ code: z.string().min(1), name: z.string().min(1), provider: z.string().optional() });

export const transactionCreateSchema = z.object({
  accountId: idSchema.optional().nullable(),
  paymentMethodId: idSchema.optional().nullable(),
  amount: moneySchema,
  currency: z.string().optional().default('USD'),
  direction: z.union([z.literal('in'), z.literal('out')]),
  referenceType: z.string().optional().nullable(),
  referenceId: idSchema.optional().nullable(),
  notes: optionalText,
});

export const expenseCreateSchema = z.object({ accountId: idSchema.optional().nullable(), amount: moneySchema, currency: z.string().optional().default('USD'), category: z.string().optional(), notes: optionalText });

export const refundCreateSchema = z.object({ transactionId: idSchema.optional().nullable(), amount: moneySchema, currency: z.string().optional().default('USD'), reason: optionalText });

export const workSessionStartSchema = z.object({ userId: idSchema.optional().nullable(), startingBalance: moneySchema.optional().nullable(), notes: optionalText });
export const workSessionCloseSchema = z.object({ endingBalance: moneySchema.optional().nullable(), notes: optionalText });

export const dailyClosingCreateSchema = z.object({ closedAt: z.string().refine((s) => Boolean(Date.parse(s))), totals: z.any().optional() });

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
