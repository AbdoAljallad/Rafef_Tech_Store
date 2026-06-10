import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Landmark, RefreshCw, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';
import type { FinanceMethodType, FinanceProvider } from '../../modules/finance/types/finance.types';
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

type MethodFormState = {
  code: string;
  name: string;
  methodType: FinanceMethodType;
  provider: string;
  providerCode: string;
  linkedAccountId: string;
  notes: string;
};

const methodTypes: FinanceMethodType[] = [
  'cash',
  'bank_transfer',
  'bank_card',
  'wallet_transfer',
  'pos_terminal',
  'instant_payment_machine',
  'service_machine',
  'customer_balance',
  'mixed',
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

function getProviderTypeForMethod(type: FinanceMethodType): FinanceProvider['provider_type'] | 'all' {
  if (type === 'bank_transfer' || type === 'bank_card') return 'bank';
  if (type === 'wallet_transfer') return 'wallet';
  if (type === 'pos_terminal' || type === 'instant_payment_machine' || type === 'service_machine') return 'payment_machine';
  if (type === 'cash') return 'cash_holder';
  return 'all';
}

export function MethodsPage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FinanceMethodType>('all');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [formState, setFormState] = useState<MethodFormState>({
    code: '',
    name: '',
    methodType: 'cash',
    provider: '',
    providerCode: '',
    linkedAccountId: '',
    notes: '',
  });

  const methodsQuery = useQuery({
    queryKey: ['finance-methods'],
    queryFn: () => financeApi.listMethods(),
  });
  const accountsQuery = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => financeApi.listAccounts(),
  });
  const providersQuery = useQuery({
    queryKey: ['finance-providers'],
    queryFn: () => financeApi.listProviders(),
  });

  const createMethod = useMutation({
    mutationFn: financeApi.createMethod,
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finance-methods'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] }),
      ]);
      setFormState({
        code: '',
        name: '',
        methodType: 'cash',
        provider: '',
        providerCode: '',
        linkedAccountId: '',
        notes: '',
      });
      setFeedback({ tone: 'success', message: t('finance.messages.methodCreated', { ns: 'app' }) });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getFinanceErrorMessage(error, t('finance.errors.generic', { ns: 'app' })) });
    },
  });

  const methods = methodsQuery.data?.items ?? [];
  const accounts = accountsQuery.data?.items ?? [];
  const providers = providersQuery.data?.items ?? [];
  const suggestedProviders = useMemo(() => {
    const providerType = getProviderTypeForMethod(formState.methodType);
    if (providerType === 'all') {
      return providers;
    }
    return providers.filter((provider) => provider.provider_type === providerType);
  }, [formState.methodType, providers]);

  const filteredMethods = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return methods.filter((method) => {
      if (typeFilter !== 'all' && method.method_type !== typeFilter) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return [
        method.code,
        method.name,
        method.provider ?? '',
        method.linked_account_name ?? '',
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [methods, search, typeFilter]);

  const linkedMethodsCount = methods.filter((method) => method.linked_account_id).length;
  const walletMethodsCount = methods.filter((method) => method.method_type === 'wallet_transfer').length;
  const bankMethodsCount = methods.filter((method) => ['bank_transfer', 'bank_card'].includes(method.method_type)).length;
  const machineMethodsCount = methods.filter((method) => ['pos_terminal', 'instant_payment_machine', 'service_machine'].includes(method.method_type)).length;

  const presets = useMemo(() => ([
    { key: 'cash', label: t('finance.methodPresets.cash', { ns: 'app' }), methodType: 'cash' as const, name: t('finance.methodTypes.cash', { ns: 'app' }), provider: '' },
    { key: 'bank', label: t('finance.methodPresets.bank', { ns: 'app' }), methodType: 'bank_transfer' as const, name: t('finance.methodTypes.bank_transfer', { ns: 'app' }), provider: 'Bank Transfer / IBAN' },
    { key: 'wallet', label: t('finance.methodPresets.wallet', { ns: 'app' }), methodType: 'wallet_transfer' as const, name: t('finance.methodTypes.wallet_transfer', { ns: 'app' }), provider: 'Vodafone Cash / Orange Cash / Etisalat Cash' },
    { key: 'pos', label: t('finance.methodPresets.pos', { ns: 'app' }), methodType: 'pos_terminal' as const, name: t('finance.methodTypes.pos_terminal', { ns: 'app' }), provider: 'POS / Meeza' },
    { key: 'instant', label: t('finance.methodPresets.instant', { ns: 'app' }), methodType: 'instant_payment_machine' as const, name: t('finance.methodTypes.instant_payment_machine', { ns: 'app' }), provider: 'Fawry / Aman / Cash Masr' },
    { key: 'service', label: t('finance.methodPresets.service', { ns: 'app' }), methodType: 'service_machine' as const, name: t('finance.methodTypes.service_machine', { ns: 'app' }), provider: 'Recharge / Internet / Electricity' },
  ]), [t]);

  function applyPreset(methodType: FinanceMethodType, name: string, provider: string) {
    setFormState((current) => ({
      ...current,
      methodType,
      name: current.name || name,
      provider: current.provider || provider,
    }));
  }

  function submit() {
    if (!formState.code.trim() || !formState.name.trim()) {
      setFeedback({ tone: 'error', message: t('finance.errors.requiredMethodFields', { ns: 'app' }) });
      return;
    }

    createMethod.mutate({
      code: formState.code.trim(),
      name: formState.name.trim(),
      methodType: formState.methodType,
      provider: formState.provider.trim() || null,
      providerCode: formState.providerCode || null,
      linkedAccountId: formState.linkedAccountId ? Number(formState.linkedAccountId) : null,
      notes: formState.notes.trim() || null,
    });
  }

  return (
    <div className="finance-methods-page">
      <header className="finance-hero tech-glass-panel">
        <div className="finance-hero-copy">
          <p className="eyebrow">{t('finance.module', { ns: 'app' })}</p>
          <h1>{t('finance.methodsTitle', { ns: 'app' })}</h1>
          <p>{t('finance.methodsHeroText', { ns: 'app' })}</p>
          <div className="finance-chip-row">
            <Badge tone="info">{t('finance.paymentMethodsCount', { ns: 'app' })}: {methods.length.toLocaleString(locale)}</Badge>
            <Badge tone="success">{t('finance.linkedMethodsCount', { ns: 'app' })}: {linkedMethodsCount.toLocaleString(locale)}</Badge>
          </div>
        </div>

        <div className="finance-hero-side">
          <p className="eyebrow">{t('finance.methodRoutingTitle', { ns: 'app' })}</p>
          <p>{t('finance.methodRoutingText', { ns: 'app' })}</p>
          <Button
            type="button"
            variant="secondary"
            icon={<RefreshCw size={16} />}
            onClick={() => {
              methodsQuery.refetch();
              accountsQuery.refetch();
            }}
          >
            {t('finance.dashboardRefresh', { ns: 'app' })}
          </Button>
        </div>
      </header>

      {feedback ? <div className={`notice ${feedback.tone === 'error' ? 'error' : ''}`}>{feedback.message}</div> : null}

      <section className="finance-summary-grid">
        <article className="finance-summary-card tech-glass-panel">
          <strong>{methods.length.toLocaleString(locale)}</strong>
          <span>{t('finance.paymentMethodsCount', { ns: 'app' })}</span>
        </article>
        <article className="finance-summary-card tech-glass-panel">
          <strong>{bankMethodsCount.toLocaleString(locale)}</strong>
          <span>{t('finance.bankMethods', { ns: 'app' })}</span>
        </article>
        <article className="finance-summary-card tech-glass-panel">
          <strong>{walletMethodsCount.toLocaleString(locale)}</strong>
          <span>{t('finance.walletMethods', { ns: 'app' })}</span>
        </article>
        <article className="finance-summary-card tech-glass-panel">
          <strong>{machineMethodsCount.toLocaleString(locale)}</strong>
          <span>{t('finance.machineMethods', { ns: 'app' })}</span>
        </article>
      </section>

      <section className="finance-content-grid">
        <div className="finance-main-column">
          <article className="finance-panel tech-glass-panel">
            <div className="finance-panel-header">
              <div>
                <h2>{t('finance.methodsListTitle', { ns: 'app' })}</h2>
                <p>{t('finance.methodsListText', { ns: 'app' })}</p>
              </div>
              <Badge tone="info">{filteredMethods.length.toLocaleString(locale)}</Badge>
            </div>

            <div className="finance-filter-grid">
              <SearchInput
                placeholder={t('finance.searchMethods', { ns: 'app' })}
                value={search}
                onChange={(event) => setSearch((event.target as HTMLInputElement).value)}
              />
              <Select
                label={t('finance.type', { ns: 'app' })}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'all' | FinanceMethodType)}
              >
                <option value="all">{t('finance.allMethodTypes', { ns: 'app' })}</option>
                {methodTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`finance.methodTypes.${type}`, { ns: 'app' })}
                  </option>
                ))}
              </Select>
            </div>

            <div className="finance-method-grid">
              {filteredMethods.map((method) => (
                <article key={method.id} className="finance-method-card">
                  <div className="finance-account-head">
                    <div className="finance-account-copy">
                      <h3>{method.name}</h3>
                      <div className="finance-account-meta">
                        <span>{method.code}</span>
                        {method.provider ? <span>{method.provider}</span> : null}
                      </div>
                    </div>
                    <Badge tone="info">{t(`finance.methodTypes.${method.method_type}`, { ns: 'app' })}</Badge>
                  </div>
                  <p className="finance-account-meta">
                    {method.linked_account_name
                      ? `${t('finance.linkedAccount', { ns: 'app' })}: ${method.linked_account_name}`
                      : t('finance.linkLater', { ns: 'app' })}
                  </p>
                  {method.notes ? <p>{method.notes}</p> : null}
                </article>
              ))}
            </div>

            <DataTable
              rows={filteredMethods}
              emptyText={t('finance.noMethods', { ns: 'app' })}
              getRowKey={(method) => method.id}
              columns={[
                { key: 'code', header: t('finance.code', { ns: 'app' }), render: (method) => method.code },
                { key: 'name', header: t('finance.name', { ns: 'app' }), render: (method) => method.name },
                { key: 'type', header: t('finance.type', { ns: 'app' }), render: (method) => t(`finance.methodTypes.${method.method_type}`, { ns: 'app' }) },
                { key: 'account', header: t('finance.linkedAccount', { ns: 'app' }), render: (method) => method.linked_account_name ?? '-' },
              ]}
            />
          </article>
        </div>

        <aside className="finance-side-column">
          <article className="finance-panel tech-glass-panel">
            <div className="finance-panel-header">
              <div>
                <h2>{t('finance.newMethod', { ns: 'app' })}</h2>
                <p>{t('finance.newMethodText', { ns: 'app' })}</p>
              </div>
            </div>

            <div className="finance-chip-row">
              {presets.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  variant="secondary"
                  onClick={() => applyPreset(preset.methodType, preset.name, preset.provider)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="finance-form-grid">
              <Input
                label={t('finance.code', { ns: 'app' })}
                value={formState.code}
                onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              />
              <Input
                label={t('finance.name', { ns: 'app' })}
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              />
              <Select
                label={t('finance.type', { ns: 'app' })}
                value={formState.methodType}
                onChange={(event) => setFormState((current) => ({ ...current, methodType: event.target.value as FinanceMethodType, providerCode: '', provider: '' }))}
              >
                {methodTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`finance.methodTypes.${type}`, { ns: 'app' })}
                  </option>
                ))}
              </Select>
              <Select
                label={t('finance.provider', { ns: 'app' })}
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
                <option value="">{t('finance.providerExamples', { ns: 'app' })}</option>
                {suggestedProviders.map((provider) => (
                  <option key={provider.code} value={provider.code}>
                    {provider.short_name ? `${provider.short_name} - ${provider.name}` : provider.name}
                  </option>
                ))}
              </Select>
              <Input
                label={t('finance.provider', { ns: 'app' })}
                value={formState.provider}
                placeholder={t('finance.providerExamples', { ns: 'app' })}
                onChange={(event) => setFormState((current) => ({ ...current, provider: event.target.value, providerCode: '' }))}
              />
              <Select
                label={t('finance.linkedAccount', { ns: 'app' })}
                value={formState.linkedAccountId}
                onChange={(event) => setFormState((current) => ({ ...current, linkedAccountId: event.target.value }))}
              >
                <option value="">{t('finance.linkLater', { ns: 'app' })}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </Select>
            </div>

            <Textarea
              label={t('finance.notes', { ns: 'app' })}
              rows={4}
              value={formState.notes}
              onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
            />
            <Button type="button" isLoading={createMethod.isPending} onClick={submit}>
              {t('finance.createMethodAction', { ns: 'app' })}
            </Button>
          </article>

          <article className="finance-panel tech-glass-panel">
            <div className="finance-panel-header">
              <div>
                <h2>{t('finance.channelFamiliesTitle', { ns: 'app' })}</h2>
                <p>{t('finance.channelFamiliesText', { ns: 'app' })}</p>
              </div>
            </div>
            <div className="finance-method-grid">
              <article className="finance-method-card">
                <div className="finance-account-head">
                  <div className="finance-account-copy">
                    <h3>{t('finance.bankMethods', { ns: 'app' })}</h3>
                    <p>{t('finance.methodTypes.bank_transfer', { ns: 'app' })}</p>
                  </div>
                  <Landmark size={18} />
                </div>
                <strong>{bankMethodsCount.toLocaleString(locale)}</strong>
              </article>
              <article className="finance-method-card">
                <div className="finance-account-head">
                  <div className="finance-account-copy">
                    <h3>{t('finance.walletMethods', { ns: 'app' })}</h3>
                    <p>{t('finance.methodTypes.wallet_transfer', { ns: 'app' })}</p>
                  </div>
                  <Smartphone size={18} />
                </div>
                <strong>{walletMethodsCount.toLocaleString(locale)}</strong>
              </article>
              <article className="finance-method-card">
                <div className="finance-account-head">
                  <div className="finance-account-copy">
                    <h3>{t('finance.machineMethods', { ns: 'app' })}</h3>
                    <p>{t('finance.methodTypes.instant_payment_machine', { ns: 'app' })}</p>
                  </div>
                  <CreditCard size={18} />
                </div>
                <strong>{machineMethodsCount.toLocaleString(locale)}</strong>
              </article>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
