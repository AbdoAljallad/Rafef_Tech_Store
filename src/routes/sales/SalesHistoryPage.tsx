import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DataTableColumn } from '../../shared/components/DataTable/DataTable';
import { salesApi } from '../../modules/sales/api/sales.api';
import type { SalesDocumentType, SalesInvoiceListItem, SalesInvoiceStatus } from '../../modules/sales/types/sales.types';
import {
  formatSalesDate,
  formatSalesMoney,
  getSalesDocumentLabel,
  getSalesErrorMessage,
  getSalesStatusLabel,
} from '../../modules/sales/utils/salesPresentation';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';

type DocumentFilter = SalesDocumentType | 'all';
type StatusFilter = SalesInvoiceStatus | 'all';

export function SalesHistoryPage() {
  const { t, i18n } = useTranslation('app');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [documentType, setDocumentType] = useState<DocumentFilter>('invoice');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const language = i18n.resolvedLanguage;
  const historyQuery = useQuery({
    queryKey: ['sales', 'history', deferredSearch, documentType, status, dateFrom, dateTo, page],
    queryFn: () => salesApi.listInvoices({
      page,
      pageSize: 20,
      search: deferredSearch,
      documentType,
      status,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  });

  const items = historyQuery.data?.items ?? [];
  const meta = historyQuery.data?.meta;
  const total = meta?.total ?? 0;
  const from = total === 0 ? 0 : ((meta?.page ?? 1) - 1) * (meta?.pageSize ?? 20) + 1;
  const to = total === 0 ? 0 : from + items.length - 1;

  const columns = useMemo<DataTableColumn<SalesInvoiceListItem>[]>(() => [
    {
      key: 'code',
      header: t('sales.fields.code'),
      render: (row) => (
        <div>
          <strong>{row.invoice_code}</strong>
          <div className="muted">{formatSalesDate(row.created_at, language)}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('sales.fields.type'),
      render: (row) => (
        <span className={`document-badge ${row.document_type}`}>
          {getSalesDocumentLabel(t, row.document_type)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('sales.fields.status'),
      render: (row) => (
        <span className={`document-badge ${row.status}`}>
          {getSalesStatusLabel(t, row.status)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: t('sales.customer'),
      render: (row) => (
        <div>
          <strong>{row.customer_name ?? t('sales.empty.customer')}</strong>
          <div className="muted">{row.customer_code || '—'}</div>
        </div>
      ),
    },
    {
      key: 'total',
      header: t('sales.total'),
      render: (row) => formatSalesMoney(row.total, language),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="history-actions">
          <Button
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/sales/invoices/${row.id}`);
            }}
          >
            {t('sales.actions.view')}
          </Button>
          <Button
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/sales/invoices/${row.id}/print?layout=a4`);
            }}
          >
            {t('sales.print')}
          </Button>
        </div>
      ),
    },
  ], [language, navigate, t]);

  return (
    <div className="sales-history-page">
      <header className="page-header sales-history-header">
        <div>
          <h1>{t('sales.titles.history')}</h1>
          <p>{t('sales.sections.archiveHint')}</p>
        </div>
        <div className="sales-history-header-actions">
          <Button variant="secondary" onClick={() => navigate('/sales/pos')}>
            {t('sales.actions.backToPos')}
          </Button>
        </div>
      </header>

      {historyQuery.isError ? (
        <div className="notice error" role="alert">{getSalesErrorMessage(historyQuery.error, t)}</div>
      ) : null}

      <section className="sales-history-card">
        <div className="sales-history-filters">
          <SearchInput
            placeholder={t('sales.fields.searchDocuments')}
            value={search}
            onChange={(event) => {
              setSearch((event.target as HTMLInputElement).value);
              setPage(1);
            }}
          />
          <Select
            label={t('sales.fields.type')}
            value={documentType}
            onChange={(event) => {
              setDocumentType(event.target.value as DocumentFilter);
              setPage(1);
            }}
          >
            <option value="all">{t('sales.filters.documentAll')}</option>
            <option value="invoice">{t('sales.documentTypes.invoice')}</option>
            <option value="quote">{t('sales.documentTypes.quote')}</option>
          </Select>
          <Select
            label={t('sales.fields.status')}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="all">{t('sales.filters.statusAll')}</option>
            <option value="draft">{t('sales.statuses.draft')}</option>
            <option value="approved">{t('sales.statuses.approved')}</option>
            <option value="voided">{t('sales.statuses.voided')}</option>
            <option value="returned">{t('sales.statuses.returned')}</option>
          </Select>
          <Input
            label={t('sales.fields.dateFrom')}
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
          <Input
            label={t('sales.fields.dateTo')}
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="sales-history-summary">
          <span>{t('sales.history.results', { from, to, total })}</span>
          <span>{t('sales.history.page', { page: meta?.page ?? 1, totalPages: meta?.totalPages ?? 1 })}</span>
        </div>

        <div className="history-table-shell">
          <DataTable
            rows={items}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={historyQuery.isLoading}
            loadingText={t('home.loading')}
            emptyText={t('sales.empty.history')}
            onRowClick={(row) => navigate(`/sales/invoices/${row.id}`)}
          />
        </div>

        <div className="sales-history-pagination">
          <Button
            variant="secondary"
            disabled={(meta?.page ?? 1) <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {t('sales.history.previous')}
          </Button>
          <Button
            variant="secondary"
            disabled={(meta?.page ?? 1) >= (meta?.totalPages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
          >
            {t('sales.history.next')}
          </Button>
        </div>
      </section>

      <style>{`
        .sales-history-page{display:grid;gap:1rem}
        .sales-history-header h1{margin:0}
        .sales-history-header p{margin:0.25rem 0 0;color:var(--color-text-muted)}
        .sales-history-header-actions{display:flex;gap:0.75rem}
        .sales-history-card{display:grid;gap:1rem;padding:1rem;border:1px solid var(--theme-action-border);border-radius:24px;background:linear-gradient(145deg,var(--theme-panel-fill-start),var(--theme-panel-fill-end));box-shadow:var(--theme-panel-shadow)}
        .sales-history-filters{display:grid;grid-template-columns:minmax(0,1.2fr) repeat(4,minmax(0,0.8fr));gap:0.75rem;align-items:end}
        .sales-history-summary{display:flex;justify-content:space-between;gap:1rem;color:var(--color-text-muted);font-size:0.92rem;flex-wrap:wrap}
        .history-table-shell{min-height:0;max-height:min(66vh,780px);overflow:hidden;border:1px solid rgba(132,156,179,0.14);border-radius:20px;background:rgba(255,255,255,0.03)}
        .history-table-shell .data-table-wrap{height:100%;overflow:auto}
        .history-actions{display:flex;gap:0.5rem;flex-wrap:wrap}
        .document-badge{display:inline-flex;align-items:center;justify-content:center;padding:0.35rem 0.8rem;border-radius:999px;font-weight:700;background:rgba(132,156,179,0.16);border:1px solid rgba(132,156,179,0.26)}
        .document-badge.invoice{color:var(--theme-accent-strong)}
        .document-badge.quote{color:var(--theme-success-strong)}
        .document-badge.approved{color:var(--theme-success-strong)}
        .document-badge.draft{color:var(--theme-warning-strong)}
        .document-badge.voided{color:var(--theme-danger-strong)}
        .sales-history-pagination{display:flex;justify-content:flex-end;gap:0.75rem;flex-wrap:wrap}
        .notice.error{padding:0.95rem 1rem;border-radius:18px;border:1px solid rgba(220,76,100,0.3);background:rgba(220,76,100,0.12)}
        .muted{font-size:0.86rem;color:var(--color-text-muted)}
        @media (max-width: 1180px){
          .sales-history-filters{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
        @media (max-width: 760px){
          .sales-history-filters{grid-template-columns:1fr}
          .sales-history-summary{flex-direction:column}
        }
      `}</style>
    </div>
  );
}
