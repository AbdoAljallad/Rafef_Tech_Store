import { z } from 'zod';

const idSchema = z.coerce.number().int().positive();
const moneySchema = z.coerce.number().min(0);
const optionalText = z.string().trim().optional().nullable();
const currencySchema = z.string().trim().min(3).max(8).optional().default('EGP');

export const financeAccountTypeSchema = z.enum([
  'cash_drawer',
  'bank_account',
  'e_wallet',
  'pos_terminal',
  'instant_payment_machine',
  'service_machine',
  'branch_safe',
  'clearing_account',
]);

export const financeMethodTypeSchema = z.enum([
  'cash',
  'bank_transfer',
  'bank_card',
  'wallet_transfer',
  'pos_terminal',
  'instant_payment_machine',
  'service_machine',
  'customer_balance',
  'mixed',
]);

export const financeOperationTypeSchema = z.enum([
  'general',
  'sale_payment',
  'supplier_payment',
  'wallet_transfer',
  'bank_transfer',
  'mobile_topup',
  'internet_topup',
  'electricity_card',
  'machine_settlement',
  'internal_transfer',
  'refund_payout',
  'adjustment',
]);

export const paymentAccountCreateSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: financeAccountTypeSchema,
  provider: optionalText,
  currency: currencySchema,
  accountNumber: optionalText,
  openingBalance: moneySchema.optional().default(0),
  notes: optionalText,
  isActive: z.boolean().optional().default(true),
});

export const paymentMethodCreateSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  methodType: financeMethodTypeSchema,
  provider: optionalText,
  linkedAccountId: idSchema.optional().nullable(),
  notes: optionalText,
});

export const transactionCreateSchema = z.object({
  accountId: idSchema.optional().nullable(),
  paymentMethodId: idSchema.optional().nullable(),
  amount: moneySchema,
  currency: currencySchema,
  direction: z.union([z.literal('in'), z.literal('out')]),
  operationType: financeOperationTypeSchema.optional().default('general'),
  referenceType: z.string().optional().nullable(),
  referenceId: idSchema.optional().nullable(),
  counterpartyName: optionalText,
  externalReference: optionalText,
  notes: optionalText,
});

export const expenseCreateSchema = z.object({ accountId: idSchema.optional().nullable(), amount: moneySchema, currency: currencySchema, category: z.string().optional(), notes: optionalText });

export const refundCreateSchema = z.object({ transactionId: idSchema.optional().nullable(), amount: moneySchema, currency: currencySchema, reason: optionalText });

export const workSessionStartSchema = z.object({ userId: idSchema.optional().nullable(), startingBalance: moneySchema.optional().nullable(), notes: optionalText });
export const workSessionCloseSchema = z.object({ endingBalance: moneySchema.optional().nullable(), notes: optionalText });

export const dailyClosingCreateSchema = z.object({ closedAt: z.string().refine((s) => Boolean(Date.parse(s))), totals: z.any().optional() });

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type FinanceAccountType = z.infer<typeof financeAccountTypeSchema>;
export type FinanceMethodType = z.infer<typeof financeMethodTypeSchema>;
export type FinanceOperationType = z.infer<typeof financeOperationTypeSchema>;
