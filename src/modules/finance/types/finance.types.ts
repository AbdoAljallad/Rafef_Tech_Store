export type FinanceAccountType =
  | 'cash_drawer'
  | 'bank_account'
  | 'e_wallet'
  | 'pos_terminal'
  | 'instant_payment_machine'
  | 'service_machine'
  | 'branch_safe'
  | 'clearing_account';

export type FinanceMethodType =
  | 'cash'
  | 'bank_transfer'
  | 'bank_card'
  | 'wallet_transfer'
  | 'pos_terminal'
  | 'instant_payment_machine'
  | 'service_machine'
  | 'customer_balance'
  | 'mixed';

export type FinanceOperationType =
  | 'general'
  | 'sale_payment'
  | 'supplier_payment'
  | 'wallet_transfer'
  | 'bank_transfer'
  | 'mobile_topup'
  | 'internet_topup'
  | 'electricity_card'
  | 'machine_settlement'
  | 'internal_transfer'
  | 'refund_payout'
  | 'adjustment';

export type FinanceAccount = {
  id: number;
  code: string;
  name: string;
  type: FinanceAccountType;
  provider: string | null;
  provider_code: string | null;
  currency: string;
  account_number: string | null;
  opening_balance: string;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  incoming_total: string;
  outgoing_total: string;
  transaction_count: number;
  expense_total: string;
  expense_count: number;
  refund_total: string;
  refund_count: number;
  current_balance: string;
};

export type FinanceMethod = {
  id: number;
  code: string;
  name: string;
  method_type: FinanceMethodType;
  provider: string | null;
  provider_code: string | null;
  linked_account_id: number | null;
  linked_account_code: string | null;
  linked_account_name: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type FinanceTransaction = {
  id: number;
  transaction_code: string;
  account_id: number | null;
  payment_method_id: number | null;
  amount: string;
  currency: string;
  direction: 'in' | 'out';
  operation_type: FinanceOperationType;
  reference_type: string | null;
  reference_id: number | null;
  counterparty_name: string | null;
  external_reference: string | null;
  notes: string | null;
  created_at: string;
  account_code: string | null;
  account_name: string | null;
  method_code: string | null;
  method_name: string | null;
};

export type FinanceDashboardSummary = {
  totalBalance: number;
  incomingTotal: number;
  outgoingTotal: number;
  expenseTotal: number;
  refundTotal: number;
  cashBalance: number;
  bankBalance: number;
  walletBalance: number;
  machineBalance: number;
  activeAccounts: number;
  bankAccounts: number;
  walletAccounts: number;
  machineAccounts: number;
  paymentMethods: number;
  accountCount: number;
  netFlow: number;
};

export type FinanceDashboard = {
  summary: FinanceDashboardSummary;
  accounts: FinanceAccount[];
  methods: FinanceMethod[];
  recentTransactions: FinanceTransaction[];
};

export type FinanceProvider = {
  id: number;
  code: string;
  provider_type: 'bank' | 'wallet' | 'payment_machine' | 'cash_holder' | string;
  name: string;
  short_name: string | null;
  parent_code: string | null;
  country_code: string;
  logo_url: string | null;
  source_url: string | null;
  notes: string | null;
  sort_order: number;
  is_active: number;
};

export type FinanceAccountCreatePayload = {
  code: string;
  name: string;
  type: FinanceAccountType;
  provider?: string | null;
  providerCode?: string | null;
  currency?: string;
  accountNumber?: string | null;
  openingBalance?: number;
  notes?: string | null;
  isActive?: boolean;
};

export type FinanceMethodCreatePayload = {
  code: string;
  name: string;
  methodType: FinanceMethodType;
  provider?: string | null;
  providerCode?: string | null;
  linkedAccountId?: number | null;
  notes?: string | null;
};

export type FinanceTransactionCreatePayload = {
  accountId?: number | null;
  paymentMethodId?: number | null;
  amount: number;
  currency?: string;
  direction: 'in' | 'out';
  operationType?: FinanceOperationType;
  referenceType?: string | null;
  referenceId?: number | null;
  counterpartyName?: string | null;
  externalReference?: string | null;
  notes?: string | null;
};
