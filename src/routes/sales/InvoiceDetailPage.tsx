import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { salesApi } from '../../modules/sales/api/sales.api';
import {
  formatSalesDate,
  formatSalesMoney,
  getSalesDocumentLabel,
  getSalesErrorMessage,
  getSalesStatusLabel,
} from '../../modules/sales/utils/salesPresentation';
import { Button } from '../../shared/ui/Button';

export function InvoiceDetailPage() {
  const { t, i18n } = useTranslation('app');
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const invoiceQuery = useQuery({
    queryKey: ['salesInvoice', id],
    queryFn: () => salesApi.getInvoice(Number(id)),
    enabled: Boolean(id),
  });
  const approveMutation = useMutation({
    mutationFn: (invoiceId: number) => salesApi.approveInvoice(invoiceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['salesInvoice', id] });
      await queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
  const voidMutation = useMutation({
    mutationFn: (payload: { reason?: string | null }) => salesApi.voidInvoice(Number(id), payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['salesInvoice', id] });
      await queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
    },
  });

  const language = i18n.resolvedLanguage;
  const invoice = invoiceQuery.data?.invoice;

  if (!id) return null;

  async function handleApprove() {
    setErrorMessage(null);

    try {
      await approveMutation.mutateAsync(Number(id));
    } catch (error) {
      setErrorMessage(getSalesErrorMessage(error, t));
    }
  }

  async function handleVoid() {
    const reason = window.prompt(t('sales.errors.voidPrompt'));
    if (reason === null) {
      return;
    }

    setErrorMessage(null);
    try {
      await voidMutation.mutateAsync({ reason });
    } catch (error) {
      setErrorMessage(getSalesErrorMessage(error, t));
    }
  }

  return (
    <div className="sales-document-page">
      <header className="page-header sales-document-header">
        <div>
          <h1>{invoice ? getSalesDocumentLabel(t, invoice.document_type) : t('sales.titles.invoice')}</h1>
          <p className="document-code">{invoice?.invoice_code ?? id}</p>
        </div>
        {invoice ? (
          <div className="document-badges">
            <span className={`document-badge ${invoice.document_type}`}>
              {getSalesDocumentLabel(t, invoice.document_type)}
            </span>
            <span className={`document-badge ${invoice.status}`}>
              {getSalesStatusLabel(t, invoice.status)}
            </span>
          </div>
        ) : null}
      </header>

      {errorMessage ? <div className="notice error" role="alert">{errorMessage}</div> : null}
      {invoiceQuery.isError ? <div className="notice error" role="alert">{getSalesErrorMessage(invoiceQuery.error, t)}</div> : null}

      {invoiceQuery.isLoading ? (
        <div className="sales-document-loading">{t('home.loading')}</div>
      ) : !invoice ? (
        <div className="sales-document-loading">{t('sales.errors.notFound')}</div>
      ) : (
        <section className="sales-document-shell">
          <article className="sales-document-card">
            <div className="document-meta-grid">
              <div>
                <strong>{t('sales.customer')}</strong>
                <div>{invoice?.customer_name ?? t('sales.empty.customer')}</div>
                {invoice?.customer_code ? <small>{invoice.customer_code}</small> : null}
              </div>
              <div>
                <strong>{t('sales.fields.createdAt')}</strong>
                <div>{formatSalesDate(invoice?.created_at, language) || '—'}</div>
              </div>
              <div>
                <strong>{t('sales.fields.approvedAt')}</strong>
                <div>{formatSalesDate(invoice?.approved_at, language) || '—'}</div>
              </div>
              <div>
                <strong>{t('sales.fields.voidedAt')}</strong>
                <div>{formatSalesDate(invoice?.voided_at, language) || '—'}</div>
              </div>
              {invoice?.repair_order_id ? (
                <div>
                  <strong>{t('repair.module')}</strong>
                  <div>#{invoice.repair_order_id}</div>
                </div>
              ) : null}
              <div>
                <strong>{t('sales.total')}</strong>
                <div>{formatSalesMoney(invoice?.total, language)}</div>
              </div>
              <div>
                <strong>{t('sales.fields.note')}</strong>
                <div>{invoice?.note_text?.trim() || t('sales.empty.note')}</div>
              </div>
            </div>

            <div className="document-lines-wrap">
              <table className="document-lines-table">
                <thead>
                  <tr>
                    <th>{t('sales.fields.product')}</th>
                    <th>{t('sales.fields.skuBarcode')}</th>
                    <th>{t('sales.fields.quantity')}</th>
                    <th>{t('sales.fields.unitPrice')}</th>
                    <th>{t('sales.fields.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice?.lines ?? []).map((line) => (
                    <tr key={line.id}>
                      <td>
                        <strong>{line.product_name}</strong>
                        <div className="muted">{line.category_name}</div>
                      </td>
                      <td>{line.product_sku || '-'}</td>
                      <td>{line.quantity}</td>
                      <td>{formatSalesMoney(line.unit_price, language)}</td>
                      <td>{formatSalesMoney(line.line_total, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="document-summary">
              <div><span>{t('sales.subtotal')}</span><strong>{formatSalesMoney(invoice?.subtotal, language)}</strong></div>
              <div><span>{t('sales.tax')}</span><strong>{formatSalesMoney(invoice?.tax, language)}</strong></div>
              <div><span>{t('sales.total')}</span><strong>{formatSalesMoney(invoice?.total, language)}</strong></div>
            </div>
          </article>

          <aside className="sales-document-actions">
            {invoice?.status === 'draft' && invoice.document_type === 'invoice' ? (
              <Button disabled={approveMutation.isPending} onClick={handleApprove}>
                {t('sales.actions.approve')}
              </Button>
            ) : null}

            {invoice?.status !== 'voided' ? (
              <Button variant="danger" disabled={voidMutation.isPending} onClick={handleVoid}>
                {t('sales.actions.void')}
              </Button>
            ) : null}

            <Button variant="secondary" onClick={() => navigate(`/sales/invoices/${id}/print?layout=a4`)}>
              {t('sales.actions.printA4')}
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/sales/invoices/${id}/print?layout=receipt`)}>
              {t('sales.actions.printReceipt')}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/sales/invoices')}>
              {t('sales.actions.archive')}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/sales/pos')}>
              {t('sales.actions.backToPos')}
            </Button>
          </aside>
        </section>
      )}

      <style>{`
        .sales-document-page{display:grid;gap:1rem}
        .sales-document-header h1{margin:0}
        .document-code{margin:0.3rem 0 0;color:var(--color-text-muted)}
        .sales-document-loading{padding:1rem;border-radius:20px;border:1px solid var(--theme-action-border);background:linear-gradient(145deg,var(--theme-panel-fill-start),var(--theme-panel-fill-end))}
        .sales-document-shell{display:grid;grid-template-columns:minmax(0,1.4fr) 280px;gap:1rem;align-items:start}
        .sales-document-card,.sales-document-actions{border:1px solid var(--theme-action-border);border-radius:22px;background:linear-gradient(145deg,var(--theme-panel-fill-start),var(--theme-panel-fill-end));box-shadow:var(--theme-panel-shadow)}
        .sales-document-card{padding:1.15rem;display:grid;gap:1rem}
        .sales-document-actions{padding:1rem;display:grid;gap:0.8rem}
        .document-badges{display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap}
        .document-badge{display:inline-flex;align-items:center;justify-content:center;padding:0.35rem 0.8rem;border-radius:999px;font-weight:700;background:rgba(132,156,179,0.16);border:1px solid rgba(132,156,179,0.26)}
        .document-badge.invoice{color:var(--theme-accent-strong)}
        .document-badge.quote{color:var(--theme-success-strong)}
        .document-badge.approved{color:var(--theme-success-strong)}
        .document-badge.draft{color:var(--theme-warning-strong)}
        .document-badge.voided{color:var(--theme-danger-strong)}
        .document-meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.9rem}
        .document-meta-grid > div{padding:0.9rem;border-radius:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(132,156,179,0.16)}
        .document-meta-grid strong{display:block;margin-bottom:0.35rem}
        .document-lines-wrap{overflow:auto;border:1px solid rgba(132,156,179,0.14);border-radius:20px;background:rgba(255,255,255,0.03)}
        .document-lines-table{width:100%;border-collapse:collapse}
        .document-lines-table th,.document-lines-table td{padding:0.8rem;border-bottom:1px solid rgba(132,156,179,0.16);text-align:start;vertical-align:top}
        .document-summary{display:grid;gap:0.55rem}
        .document-summary > div{display:flex;justify-content:space-between;gap:1rem;padding:0.8rem 0.95rem;border-radius:16px;background:rgba(255,255,255,0.05)}
        .notice.error{padding:0.95rem 1rem;border-radius:18px;border:1px solid rgba(220,76,100,0.3);background:rgba(220,76,100,0.12)}
        .muted{font-size:0.86rem;color:var(--color-text-muted)}
        @media (max-width: 1080px){
          .sales-document-shell{grid-template-columns:1fr}
          .document-meta-grid{grid-template-columns:1fr}
        }
      `}</style>
    </div>
  );
}
