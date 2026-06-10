import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, RefreshCw, Smartphone, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';
import type { FinanceAccountType, FinanceProvider } from '../../modules/finance/types/finance.types';
import { isApiError } from '../../shared/api/apiErrors';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

type FeedbackState = {
  tone: 'success' | 'error';
  message: string;
};

type AccountFormState = {
  code: string;
  name: string;
  type: FinanceAccountType;
  provider: string;
  providerCode: string;
  currency: string;
  accountNumber: string;
  openingBalance: string;
  notes: string;
};

const accountTypes: FinanceAccountType[] = [
  'cash_drawer',
  'bank_account',
  'e_wallet',
  'pos_terminal',
  'instant_payment_machine',
  'service_machine',
  'branch_safe',
  'clearing_account',
];

function getFinanceErrorMessage(error: unknown, fallback: string) {
  if (isApiError(error)) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function getProviderTypeForAccount(type: FinanceAccountType): FinanceProvider['provider_type'] | 'all' {
  if (type === 'bank_account' || type === 'clearing_account') return 'bank';
  if (type === 'e_wallet') return 'wallet';
  if (type === 'instant_payment_machine' || type === 'service_machine' || type === 'pos_terminal') return 'payment_machine';
  if (type === 'cash_drawer' || type === 'branch_safe') return 'cash_holder';
  return 'all';
}

export function AccountsPage() {
  const { t, i18n } = useTranslation('app');
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FinanceAccountType>('all');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [formState, setFormState] = useState<AccountFormState>({
    code: '',
    name: '',
    type: 'cash_drawer',
    provider: '',
    providerCode: '',
    currency: 'EGP',
    accountNumber: '',
    openingBalance: '0',
    notes: '',
  });

  const dashboardQuery = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => financeApi.getDashboard(),
  });
  const providersQuery = useQuery({
    queryKey: ['finance-providers'],
    queryFn: () => financeApi.listProviders(),
  });

  const createAccount = useMutation({
    mutationFn: financeApi.createAccount,
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-accounts'] }),
      ]);
      setFormState({
        code: '',
        name: '',
        type: 'cash_drawer',
        provider: '',
        providerCode: '',
        currency: 'EGP',
        accountNumber: '',
        openingBalance: '0',
        notes: '',
      });
      setFeedback({ tone: 'success', message: t('finance.messages.accountCreated') });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getFinanceErrorMessage(error, t('finance.errors.generic')) });
    },
  });

  const dashboard = dashboardQuery.data;
  const accounts = dashboard?.accounts ?? [];
  const providers = providersQuery.data?.items ?? [];
  const recentTransactions = dashboard?.recentTransactions ?? [];
  const summary = dashboard?.summary;
  const suggestedProviders = useMemo(() => {
    const providerType = getProviderTypeForAccount(formState.type);
    if (providerType === 'all') {
      return providers;
    }
    return providers.filter((provider) => provider.provider_type === providerType);
  }, [formState.type, providers]);

  const filteredAccounts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (typeFilter !== 'all' && account.type !== typeFilter) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return [
        account.code,
        account.name,
        account.provider ?? '',
        account.account_number ?? '',
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [accounts, search, typeFilter]);

  const presets = useMemo(() => ([
    {
      key: 'cash',
      label: t('finance.presets.cashDrawer'),
      values: { type: 'cash_drawer' as const, name: t('finance.accountTypes.cash_drawer'), provider: '' },
    },
    {
      key: 'bank',
      label: t('finance.presets.bankAccount'),
      values: { type: 'bank_account' as const, name: t('finance.accountTypes.bank_account'), provider: 'CIB / NBE / Banque Misr' },
    },
    {
      key: 'wallet',
      label: t('finance.presets.wallet'),
      values: { type: 'e_wallet' as const, name: t('finance.accountTypes.e_wallet'), provider: 'Vodafone Cash / Orange Cash / Etisalat Cash' },
    },
    {
      key: 'terminal',
      label: t('finance.presets.posTerminal'),
      values: { type: 'pos_terminal' as const, name: t('finance.accountTypes.pos_terminal'), provider: 'POS / Meeza / Card Terminal' },
    },
    {
      key: 'instant',
      label: t('finance.presets.instantMachine'),
      values: { type: 'instant_payment_machine' as const, name: t('finance.accountTypes.instant_payment_machine'), provider: 'Fawry / Aman / Cash Masr' },
    },
    {
      key: 'service',
      label: t('finance.presets.serviceMachine'),
      values: { type: 'service_machine' as const, name: t('finance.accountTypes.service_machine'), provider: 'Recharge / Internet / Electricity' },
    },
  ]), [t]);

  function formatMoney(value: string | number | null | undefined, currency = 'EGP') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  function formatDateTime(value: string | null | undefined) {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  function applyPreset(type: FinanceAccountType, name: string, provider: string) {
    setFormState((current) => ({
      ...current,
      type,
      name: current.name || name,
      provider: current.provider || provider,
    }));
  }

  function submit() {
    if (!formState.code.trim() || !formState.name.trim()) {
      setFeedback({ tone: 'error', message: t('finance.errors.requiredAccountFields') });
      return;
    }

    createAccount.mutate({
      code: formState.code.trim(),
      name: formState.name.trim(),
      type: formState.type,
      provider: formState.provider.trim() || null,
      providerCode: formState.providerCode || null,
      currency: formState.currency.trim().toUpperCase() || 'EGP',
      accountNumber: formState.accountNumber.trim() || null,
      openingBalance: Number(formState.openingBalance) || 0,
      notes: formState.notes.trim() || null,
      isActive: true,
    });
  }

  return (
    <div className="finance-overview-page">
      <header className="finance-hero tech-glass-panel">
        <div className="finance-hero-copy">
          <p className="eyebrow">{t('finance.module')}</p>
          <h1>{t('finance.accountsTitle')}</h1>
          <p>{t('finance.accountsHeroText')}</p>
          <div className="finance-chip-row">
            <Badge tone="success">
              {t('finance.totalBalance')}: {formatMoney(summary?.totalBalance ?? 0)}
            </Badge>
            <Badge tone="info">
              {t('finance.activeAccounts')}: {(summary?.activeAccounts ?? 0).toLocaleString(locale)}
            </Badge>
            <Badge>
              {t('finance.paymentMethodsCount')}: {(summary?.paymentMethods ?? 0).toLocaleString(locale)}
            </Badge>
          </div>
        </div>

        <div className="finance-hero-side">
          <p className="eyebrow">{t('finance.overviewTitle')}</p>
          <p>{t('finance.dashboardHint')}</p>
          <Button
            type="button"
            variant="secondary"
            icon={<RefreshCw size={16} />}
            onClick={() => dashboardQuery.refetch()}
          >
            {t('finance.dashboardRefresh')}
          </Button>
        </div>
      </header>

      {feedback ? <div className={`notice ${feedback.tone === 'error' ? 'error' : ''}`}>{feedback.message}</div> : null}

      <section className="finance-summary-grid">
        <article className="finance-summary-card tech-glass-panel">
          <strong>{formatMoney(summary?.totalBalance ?? 0)}</strong>
          <span>{t('finance.totalBalance')}</span>
        </article>
        <article className="finance-summary-card tech-glass-panel">
          <strong>{formatMoney(summary?.bankBalance ?? 0)}</strong>
          <span>{t('finance.bankBalance')}</span>
        </article>
        <article className="finance-summary-card tech-glass-panel">
          <strong>{formatMoney(summary?.walletBalance ?? 0)}</strong>
          <span>{t('finance.walletBalance')}</span>
        </article>
        <article className="finance-summary-card tech-glass-panel">
          <strong>{formatMoney(summary?.machineBalance ?? 0)}</strong>
          <span>{t('finance.machineBalance')}</span>
        </article>
      </section>

      <section className="finance-content-grid">
        <div className="finance-main-column">
          <article className="finance-panel tech-glass-panel">
            <div className="finance-panel-header">
              <div>
                <h2>{t('finance.accountCardsTitle')}</h2>
                <p>{t('finance.accountCardsText')}</p>
              </div>
              <Badge tone="info">{filteredAccounts.length.toLocaleString(locale)}</Badge>
            </div>

            <div className="finance-filter-grid">
              <SearchInput
                placeholder={t('finance.searchAccounts')}
                value={search}
                onChange={(event) => setSearch((event.target as HTMLInputElement).value)}
              />
              <Select label={t('finance.type')} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | FinanceAccountType)}>
                <option value="all">{t('finance.allTypes')}</option>
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`finance.accountTypes.${type}`)}
                  </option>
                ))}
              </Select>
            </div>

            {filteredAccounts.length ? (
              <div className="finance-account-grid">
                {filteredAccounts.map((account) => (
                  <article key={account.id} className="finance-account-card">
                    <div className="finance-account-head">
                      <div className="finance-account-copy">
                        <h3>{account.name}</h3>
                        <div className="finance-account-meta">
                          <span>{account.code}</span>
                          {account.provider ? <span>{account.provider}</span> : null}
                        </div>
                      </div>
                      <Badge tone={Number(account.is_active) === 1 ? 'success' : 'warning'}>
                        {t(`finance.accountTypes.${account.type}`)}
                      </Badge>
                    </div>

                    <div className="finance-account-balance">
                      <span className="finance-account-meta">{account.currency}</span>
                      <strong>{formatMoney(account.current_balance, account.currency)}</strong>
                    </div>

                    <div className="finance-account-meta">
                      {account.account_number ? <span>{account.account_number}</span> : null}
                      {account.notes ? <span>{account.notes}</span> : null}
                    </div>

                    <div className="finance-account-metrics">
                      <div className="finance-account-metric">
                        <span>{t('finance.incoming')}</span>
                        <strong>{formatMoney(account.incoming_total, account.currency)}</strong>
                      </div>
                      <div className="finance-account-metric">
                        <span>{t('finance.outgoing')}</span>
                        <strong>{formatMoney(account.outgoing_total, account.currency)}</strong>
                      </div>
                      <div className="finance-account-metric">
                        <span>{t('finance.expenses')}</span>
                        <strong>{formatMoney(account.expense_total, account.currency)}</strong>
                      </div>
                      <div className="finance-account-metric">
                        <span>{t('finance.transactionCount')}</span>
                        <strong>{Number(account.transaction_count ?? 0).toLocaleString(locale)}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="finance-empty-state">
                <strong>{t('finance.noAccounts')}</strong>
                <p className="finance-empty-copy">{t('finance.accountsEmptyText')}</p>
              </div>
            )}
          </article>

          <article className="finance-panel tech-glass-panel">
            <div className="finance-panel-header">
              <div>
                <h2>{t('finance.recentTransactions')}</h2>
                <p>{t('finance.recentTransactionsText')}</p>
              </div>
              <Badge tone="info">{recentTransactions.length.toLocaleString(locale)}</Badge>
            </div>

            <DataTable
              rows={recentTransactions}
              emptyText={t('finance.noTransactions')}
              getRowKey={(row) => row.id}
              columns={[
                {
                  key: 'code',
                  header: t('finance.code'),
                  render: (row) => (
                    <div>
                      <strong>{row.transaction_code}</strong>
                      <div className="muted">{formatDateTime(row.created_at)}</div>
                    </div>
                  ),
                },
                {
                  key: 'account',
                  header: t('finance.account'),
                  render: (row) => row.account_name ?? '-',
                },
                {
                  key: 'operation',
                  header: t('finance.operationType'),
                  render: (row) => t(`finance.operationTypes.${row.operation_type}`),
                },
                {
                  key: 'amount',
                  header: t('finance.amount'),
                  render: (row) => (
                    <Badge tone={row.direction === 'in' ? 'success' : 'warning'}>
                      {formatMoney(row.amount, row.currency)}
                    </Badge>
                  ),
                },
              ]}
            />
          </article>
        </div>

        <aside className="finance-side-column">
          <article className="finance-panel tech-glass-panel">
            <div className="finance-panel-header">
              <div>
                <h2>{t('finance.newAccount')}</h2>
                <p>{t('finance.accountFormText')}</p>
              </div>
            </div>

            <div className="finance-chip-row">
              {presets.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  variant="secondary"
                  onClick={() => applyPreset(preset.values.type, preset.values.name, preset.values.provider)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="finance-form-grid">
              <Input
                label={t('finance.code')}
                value={formState.code}
                onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              />
              <Input
                label={t('finance.name')}
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              />
              <Select
                label={t('finance.type')}
                value={formState.type}
                onChange={(event) => setFormState((current) => ({ ...current, type: event.target.value as FinanceAccountType, providerCode: '', provider: '' }))}
              >
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`finance.accountTypes.${type}`)}
                  </option>
                ))}
              </Select>
              <Input
                label={t('finance.currency')}
                value={formState.currency}
                onChange={(event) => setFormState((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
              />
              <Select
                label={t('finance.provider')}
                value={formState.providerCode}
                onChange={(event) => {
                  const providerCode = event.target.value;
                  const provider = suggestedProviders.find((entry) => entry.code === providerCode);
                  setFormState((current) => ({
                    ...current,
                    providerCode,
                    provider: provider?.name ?? current.provider,
                  }));
                }}
              >
                <option value="">{t('finance.providerExamples')}</option>
                {suggestedProviders.map((provider) => (
                  <option key={provider.code} value={provider.code}>
                    {provider.short_name ? `${provider.short_name} - ${provider.name}` : provider.name}
                  </option>
                ))}
              </Select>
              <Input
                label={t('finance.provider')}
                value={formState.provider}
                onChange={(event) => setFormState((current) => ({ ...current, provider: event.target.value, providerCode: '' }))}
                placeholder={t('finance.providerExamples')}
              />
              <Input
                label={t('finance.accountNumber')}
                value={formState.accountNumber}
                onChange={(event) => setFormState((current) => ({ ...current, accountNumber: event.target.value }))}
                placeholder={t('finance.accountNumberPlaceholder')}
              />
              <Input
                label={t('finance.openingBalance')}
                value={formState.openingBalance}
                type="number"
                step="0.01"
                onChange={(event) => setFormState((current) => ({ ...current, openingBalance: event.target.value }))}
              />
            </div>
            <p className="finance-provider-hint">{t('finance.providerHint')}</p>
            <Textarea
              label={t('finance.notes')}
              rows={4}
              value={formState.notes}
              onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
            />
            <Button type="button" isLoading={createAccount.isPending} onClick={submit}>
              {t('finance.createAccountAction')}
            </Button>
          </article>

          <article className="finance-panel tech-glass-panel">
            <div className="finance-panel-header">
              <div>
                <h2>{t('finance.typeBreakdown')}</h2>
                <p>{t('finance.typeBreakdownText')}</p>
              </div>
            </div>

            <div className="finance-account-grid">
              <article className="finance-account-card">
                <div className="finance-account-head">
                  <div className="finance-account-copy">
                    <h3>{t('finance.cashBalance')}</h3>
                    <p>{t('finance.accountTypes.cash_drawer')}</p>
                  </div>
                  <WalletCards size={18} />
                </div>
                <div className="finance-account-balance">
                  <strong>{formatMoney(summary?.cashBalance ?? 0)}</strong>
                </div>
              </article>
              <article className="finance-account-card">
                <div className="finance-account-head">
                  <div className="finance-account-copy">
                    <h3>{t('finance.bankBalance')}</h3>
                    <p>{(summary?.bankAccounts ?? 0).toLocaleString(locale)} {t('finance.bankAccounts')}</p>
                  </div>
                  <Landmark size={18} />
                </div>
                <div className="finance-account-balance">
                  <strong>{formatMoney(summary?.bankBalance ?? 0)}</strong>
                </div>
              </article>
              <article className="finance-account-card">
                <div className="finance-account-head">
                  <div className="finance-account-copy">
                    <h3>{t('finance.walletBalance')}</h3>
                    <p>{(summary?.walletAccounts ?? 0).toLocaleString(locale)} {t('finance.walletAccounts')}</p>
                  </div>
                  <Smartphone size={18} />
                </div>
                <div className="finance-account-balance">
                  <strong>{formatMoney(summary?.walletBalance ?? 0)}</strong>
                </div>
              </article>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
