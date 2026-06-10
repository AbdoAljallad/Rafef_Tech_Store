import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, BellRing, BriefcaseBusiness, FolderKanban, Settings2, ShieldCheck, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { crmApi } from '../../modules/crm/api/crm.api';
import { reportsApi } from '../../modules/reports/api/reports.api';
import { salesApi } from '../../modules/sales/api/sales.api';
import { WidgetArea } from '../../modules/command-center/components/WidgetArea';

const operationIcons = [BriefcaseBusiness, Wrench, Activity] as const;

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isToday(value: unknown) {
  if (!value) {
    return false;
  }

  const date = new Date(String(value));
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function CommandCenterPage() {
  const { t, i18n } = useTranslation(['app', 'modules']);
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        currency: 'EGP',
        maximumFractionDigits: 0,
        style: 'currency',
      }),
    [locale],
  );
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  function formatCount(value: number) {
    return numberFormatter.format(Math.max(0, Math.round(value)));
  }

  function metricValue(isLoading: boolean, isError: boolean, value: string) {
    if (isLoading) {
      return t('app:home.loading');
    }

    return isError ? t('app:home.noData') : value;
  }

  const salesQuery = useQuery({
    queryKey: ['command-center', 'sales-today'],
    queryFn: () => salesApi.listInvoices({ offset: 0, limit: 100 }),
  });

  const repairQuery = useQuery({
    queryKey: ['command-center', 'repair-report'],
    queryFn: () => reportsApi.get('repair'),
  });

  const inventoryQuery = useQuery({
    queryKey: ['command-center', 'inventory-report'],
    queryFn: () => reportsApi.get('inventory'),
  });

  const customersQuery = useQuery({
    queryKey: ['command-center', 'customers-total'],
    queryFn: () => crmApi.listCustomers(undefined, { page: 1, pageSize: 1 }),
  });

  const metrics = useMemo(() => {
    const invoices = salesQuery.data?.items ?? [];
    const todayInvoices = invoices.filter((invoice) => isToday(invoice.created_at) && invoice.status !== 'voided');
    const todaySalesTotal = todayInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

    const repairReport = repairQuery.data?.report;
    const repairOrders = toNumber(repairReport?.orders);
    const repairDelivered = toNumber(repairReport?.delivered);
    const repairCancelled = toNumber(repairReport?.cancelled);
    const activeRepairOrders = repairOrders - repairDelivered - repairCancelled;

    const inventoryReport = inventoryQuery.data?.report;
    const products = toNumber(inventoryReport?.products);

    const customersTotal = toNumber(customersQuery.data?.meta?.total);

    return [
      {
        label: t('modules:navigation.customers'),
        value: metricValue(customersQuery.isLoading, customersQuery.isError, formatCount(customersTotal)),
      },
      {
        label: t('modules:navigation.repair'),
        value: metricValue(repairQuery.isLoading, repairQuery.isError, formatCount(activeRepairOrders)),
      },
      {
        label: t('modules:navigation.inventory'),
        value: metricValue(inventoryQuery.isLoading, inventoryQuery.isError, formatCount(products)),
      },
      {
        label: t('modules:navigation.sales'),
        value: metricValue(salesQuery.isLoading, salesQuery.isError, currencyFormatter.format(todaySalesTotal)),
      },
    ];
  }, [
    currencyFormatter,
    customersQuery.data?.meta?.total,
    customersQuery.isError,
    customersQuery.isLoading,
    inventoryQuery.data?.report,
    inventoryQuery.isError,
    inventoryQuery.isLoading,
    repairQuery.data?.report,
    repairQuery.isError,
    repairQuery.isLoading,
    salesQuery.data?.items,
    salesQuery.isError,
    salesQuery.isLoading,
    t,
  ]);

  const operations = [
    { title: t('app:commandCenter.operations.crmTitle'), text: t('app:commandCenter.operations.crmText'), to: '/customers' },
    { title: t('app:commandCenter.operations.repairTitle'), text: t('app:commandCenter.operations.repairText'), to: '/repair/orders' },
    { title: t('app:commandCenter.operations.financeTitle'), text: t('app:commandCenter.operations.financeText'), to: '/sales/pos' },
  ];

  const quickActions = [
    { label: t('app:commandCenter.quickActions.customers'), to: '/customers' },
    { label: t('app:commandCenter.quickActions.repair'), to: '/repair/orders' },
    { label: t('app:commandCenter.quickActions.sales'), to: '/sales/pos' },
    { label: t('app:commandCenter.quickActions.reports'), to: '/reports' },
  ];

  const protocols = [
    t('app:commandCenter.protocols.sync'),
    t('app:commandCenter.protocols.alerts'),
    t('app:commandCenter.protocols.handoff'),
  ];

  return (
    <>
      <style>{`
        .command-center-page {
          display: grid;
          gap: 1rem;
        }

        .command-center-hero,
        .command-center-panel,
        .command-center-actions-panel {
          border: 1px solid color-mix(in srgb, var(--accent-primary) 18%, var(--color-border));
          border-radius: 28px;
          background:
            radial-gradient(circle at top right, color-mix(in srgb, var(--accent-soft) 16%, transparent), transparent 38%),
            linear-gradient(145deg, color-mix(in srgb, var(--color-surface) 92%, white), color-mix(in srgb, var(--color-surface-muted) 84%, var(--accent-soft) 16%));
          box-shadow: var(--theme-panel-shadow);
          backdrop-filter: blur(18px);
        }

        .command-center-hero {
          position: relative;
          overflow: hidden;
          padding: 1.2rem;
        }

        .command-center-hero::before {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(var(--home-grid-line) 1px, transparent 1px),
            linear-gradient(90deg, var(--home-grid-line) 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.46;
          content: "";
          mask-image: linear-gradient(180deg, #000, transparent 82%);
          pointer-events: none;
        }

        .command-center-hero > * {
          position: relative;
          z-index: 1;
        }

        .command-center-topbar {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .command-center-topbar h1,
        .command-center-hero p,
        .command-center-section-copy h2,
        .command-center-section-copy p,
        .command-center-list,
        .command-center-protocol-list {
          margin: 0;
        }

        .command-center-topbar p:last-child,
        .command-center-section-copy p,
        .command-center-protocol-list li,
        .command-center-operation-card p {
          color: var(--color-text-muted);
          line-height: 1.6;
        }

        .command-center-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          align-items: center;
          justify-content: flex-end;
        }

        .command-center-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
          margin-top: 0.85rem;
        }

        .command-center-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border: 1px solid color-mix(in srgb, var(--accent-primary) 18%, var(--color-border));
          border-radius: 999px;
          background: color-mix(in srgb, var(--color-surface) 80%, transparent);
          font-size: 0.8rem;
          font-weight: 800;
          padding: 0.42rem 0.78rem;
        }

        .command-center-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .command-center-metric {
          display: grid;
          gap: 0.35rem;
          border: 1px solid color-mix(in srgb, var(--accent-primary) 16%, var(--color-border));
          border-radius: 22px;
          background: color-mix(in srgb, var(--color-surface) 84%, transparent);
          padding: 0.95rem;
        }

        .command-center-metric span {
          color: var(--color-text-muted);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .command-center-metric strong {
          color: var(--tech-text);
          font-size: 1.6rem;
          line-height: 1;
        }

        .command-center-body {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.9fr);
          gap: 1rem;
        }

        .command-center-panel,
        .command-center-actions-panel {
          display: grid;
          gap: 1rem;
          padding: 1.1rem;
        }

        .command-center-section-copy {
          display: grid;
          gap: 0.35rem;
        }

        .command-center-operations {
          display: grid;
          gap: 0.8rem;
        }

        .command-center-operation-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 0.85rem;
          align-items: start;
          border: 1px solid color-mix(in srgb, var(--accent-primary) 14%, var(--color-border));
          border-radius: 22px;
          background: color-mix(in srgb, var(--color-surface) 82%, transparent);
          padding: 0.95rem;
        }

        .command-center-operation-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: var(--color-primary-strong);
          background: color-mix(in srgb, var(--accent-soft) 18%, var(--color-surface));
          border: 1px solid color-mix(in srgb, var(--accent-primary) 16%, var(--color-border));
        }

        .command-center-operation-card h3 {
          margin: 0 0 0.25rem;
        }

        .command-center-arrow {
          color: var(--tech-accent);
          margin-top: 0.2rem;
        }

        .command-center-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .command-center-action-link {
          display: inline-flex;
          gap: 0.55rem;
          align-items: center;
          justify-content: space-between;
          min-height: 54px;
          text-decoration: none;
          padding-inline: 0.9rem;
        }

        .command-center-protocols {
          display: grid;
          gap: 0.75rem;
          border-top: 1px solid color-mix(in srgb, var(--accent-primary) 14%, var(--color-border));
          padding-top: 0.9rem;
        }

        .command-center-protocol-list {
          display: grid;
          gap: 0.55rem;
          padding-left: 1.1rem;
        }

        .command-center-widget-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-content: start;
        }

        .command-center-widget-wrap .widget-card {
          min-height: 220px;
          border-radius: 24px;
          background:
            linear-gradient(145deg, var(--theme-panel-fill-start), var(--theme-panel-fill-end)),
            radial-gradient(circle at top right, color-mix(in srgb, var(--accent-soft) 12%, transparent), transparent 34%);
          box-shadow: var(--theme-panel-shadow);
        }

        .command-center-widget-body {
          display: grid;
          gap: 0.8rem;
        }

        .command-center-widget-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: var(--color-primary-strong);
          background: color-mix(in srgb, var(--accent-soft) 18%, var(--color-surface));
          border: 1px solid color-mix(in srgb, var(--accent-primary) 18%, var(--color-border));
        }

        .command-center-list {
          display: grid;
          gap: 0.55rem;
          padding-left: 1.1rem;
          color: var(--color-text-muted);
        }

        .command-center-inline-action {
          width: fit-content;
        }

        @media (max-width: 1080px) {
          .command-center-body {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 860px) {
          .command-center-topbar,
          .command-center-hero-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .command-center-metrics,
          .command-center-actions-grid,
          .command-center-widget-grid {
            grid-template-columns: 1fr;
          }

          .command-center-operation-card {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .command-center-arrow {
            display: none;
          }
        }
      `}</style>

      <div className="command-center-page">
        <section className="command-center-hero">
          <div className="command-center-topbar">
            <div>
              <p className="eyebrow">{t('app:commandCenter.eyebrow')}</p>
              <h1>{t('modules:navigation.commandCenter')}</h1>
              <p>{t('app:commandCenter.description')}</p>
              <div className="command-center-chip-row">
                <span className="command-center-chip">
                  <ShieldCheck size={14} />
                  {t('app:commandCenter.heroStatusPrimary')}
                </span>
                <span className="command-center-chip">
                  <BellRing size={14} />
                  {t('app:commandCenter.heroStatusSecondary')}
                </span>
              </div>
            </div>

            <div className="command-center-hero-actions">
              <Link className="tech-action" to="/home">
                {t('app:commandCenter.backHome')}
              </Link>
              <Link className="tech-action" to="/events">
                {t('app:commandCenter.openEvents')}
              </Link>
            </div>
          </div>

          <div className="command-center-metrics">
            {metrics.map((metric) => (
              <div className="command-center-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="command-center-body">
          <div className="command-center-panel">
            <div className="command-center-section-copy">
              <h2>{t('app:commandCenter.operationsTitle')}</h2>
              <p>{t('app:commandCenter.operationsLead')}</p>
            </div>

            <div className="command-center-operations">
              {operations.map((operation, index) => {
                const Icon = operationIcons[index];
                return (
                  <Link className="command-center-operation-card" key={operation.title} to={operation.to}>
                    <span className="command-center-operation-icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h3>{operation.title}</h3>
                      <p>{operation.text}</p>
                    </div>
                    <ArrowRight className="command-center-arrow" size={18} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="command-center-actions-panel">
            <div className="command-center-section-copy">
              <h2>{t('app:commandCenter.quickActionsTitle')}</h2>
              <p>{t('app:commandCenter.quickActionsLead')}</p>
            </div>

            <div className="command-center-actions-grid">
              {quickActions.map((action) => (
                <Link className="tech-action command-center-action-link" key={action.to} to={action.to}>
                  <span>{action.label}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </div>

            <div className="command-center-protocols">
              <div className="command-center-section-copy">
                <h2>{t('app:commandCenter.protocolsTitle')}</h2>
                <p>{t('app:commandCenter.protocolsLead')}</p>
              </div>

              <ol className="command-center-protocol-list">
                {protocols.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>

              <Link className="tech-action command-center-action-link" to="/settings">
                <span>{t('modules:navigation.settings')}</span>
                <Settings2 size={16} aria-hidden="true" />
              </Link>

              <Link className="tech-action command-center-action-link" to="/projects">
                <span>{t('modules:navigation.projects')}</span>
                <FolderKanban size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <WidgetArea />
      </div>
    </>
  );
}
