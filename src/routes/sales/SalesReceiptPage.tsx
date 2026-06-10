import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { salesApi } from '../../modules/sales/api/sales.api';
import type { SalesInvoicePrintPayload } from '../../modules/sales/types/sales.types';
import {
  formatSalesDate,
  formatSalesMoney,
  getSalesDocumentLabel,
  getSalesErrorMessage,
} from '../../modules/sales/utils/salesPresentation';
import { logos } from '../../shared/assets/logos';
import { Button } from '../../shared/ui/Button';
import { Textarea } from '../../shared/ui/Textarea';

type PrintLayout = 'a4' | 'receipt';

function defaultLayoutFromPath() {
  return window.location.pathname.endsWith('/receipt') ? 'receipt' : 'a4';
}

export function SalesReceiptPage() {
  const { t, i18n } = useTranslation('app');
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const layout = (searchParams.get('layout') === 'receipt'
    ? 'receipt'
    : searchParams.get('layout') === 'a4'
      ? 'a4'
      : defaultLayoutFromPath()) as PrintLayout;
  const receiptQuery = useQuery({
    queryKey: ['salesReceipt', id],
    queryFn: () => salesApi.getInvoice(Number(id)),
    enabled: Boolean(id),
  });
  const receipt = receiptQuery.data?.invoice;
  const [draft, setDraft] = useState<SalesInvoicePrintPayload>({
    noteText: '',
    a4HeaderText: '',
    a4FooterText: '',
    receiptHeaderText: '',
    receiptFooterText: '',
  });

  const saveMutation = useMutation({
    mutationFn: (payload: SalesInvoicePrintPayload) => salesApi.updateInvoice(Number(id), payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['salesReceipt', id] });
      await queryClient.invalidateQueries({ queryKey: ['salesInvoice', id] });
      await queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
    },
  });

  useEffect(() => {
    if (!receipt) return;

    setDraft({
      noteText: receipt.note_text ?? '',
      a4HeaderText: receipt.a4_header_text ?? '',
      a4FooterText: receipt.a4_footer_text ?? '',
      receiptHeaderText: receipt.receipt_header_text ?? '',
      receiptFooterText: receipt.receipt_footer_text ?? '',
    });
  }, [receipt]);

  const language = i18n.resolvedLanguage;
  const preview = useMemo(() => {
    const documentLabel = receipt ? getSalesDocumentLabel(t, receipt.document_type) : t('sales.titles.invoice');

    return {
      noteText: draft.noteText?.trim() || '',
      a4HeaderText: draft.a4HeaderText?.trim() || `${documentLabel}\nRafef Tech Store`,
      a4FooterText: draft.a4FooterText?.trim() || t('sales.printDefaults.a4Footer'),
      receiptHeaderText: draft.receiptHeaderText?.trim() || `Rafef Tech Store\n${documentLabel}`,
      receiptFooterText: draft.receiptFooterText?.trim() || t('sales.printDefaults.receiptFooter'),
    };
  }, [draft, receipt, t]);
  const hasPrintChanges = useMemo(() => {
    if (!receipt) {
      return false;
    }

    return (
      (draft.noteText ?? '') !== (receipt.note_text ?? '') ||
      (draft.a4HeaderText ?? '') !== (receipt.a4_header_text ?? '') ||
      (draft.a4FooterText ?? '') !== (receipt.a4_footer_text ?? '') ||
      (draft.receiptHeaderText ?? '') !== (receipt.receipt_header_text ?? '') ||
      (draft.receiptFooterText ?? '') !== (receipt.receipt_footer_text ?? '')
    );
  }, [draft, receipt]);

  if (!id) return null;

  async function savePrintContent() {
    setErrorMessage(null);

    try {
      await saveMutation.mutateAsync(draft);
    } catch (error) {
      setErrorMessage(getSalesErrorMessage(error, t));
      throw error;
    }
  }

  async function handlePrint() {
    try {
      if (hasPrintChanges) {
        await savePrintContent();
      }
      window.print();
    } catch {
      return;
    }
  }

  return (
    <div className={`sales-print-page layout-${layout}`}>
      <header className="page-header sales-print-toolbar">
        <div>
          <h1>{t('sales.titles.print')}</h1>
          <p className="print-toolbar-subtitle">
            {receipt ? `${getSalesDocumentLabel(t, receipt.document_type)} ${receipt.invoice_code}` : id}
          </p>
        </div>
        <div className="sales-print-toolbar-actions">
          <Button
            variant={layout === 'a4' ? 'primary' : 'secondary'}
            onClick={() => setSearchParams({ layout: 'a4' })}
          >
            {t('sales.printLayouts.a4')}
          </Button>
          <Button
            variant={layout === 'receipt' ? 'primary' : 'secondary'}
            onClick={() => setSearchParams({ layout: 'receipt' })}
          >
            {t('sales.printLayouts.receipt')}
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/sales/invoices/${id}`)}>
            {t('sales.actions.backToDocument')}
          </Button>
          <Button disabled={saveMutation.isPending} onClick={handlePrint}>
            {t('sales.actions.saveAndPrint')}
          </Button>
        </div>
      </header>

      {errorMessage ? <div className="notice error" role="alert">{errorMessage}</div> : null}
      {receiptQuery.isError ? <div className="notice error" role="alert">{getSalesErrorMessage(receiptQuery.error, t)}</div> : null}

      {receiptQuery.isLoading ? (
        <div className="sales-print-loading">{t('home.loading')}</div>
      ) : (
        <section className="sales-print-shell">
          <aside className="sales-print-controls">
            <div className="sales-print-controls-card">
              <div>
                <h2>{t('sales.sections.printControls')}</h2>
                <p>{t('sales.sections.printControlsHint')}</p>
              </div>
              <Textarea
                label={t('sales.fields.a4Header')}
                rows={4}
                value={draft.a4HeaderText ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, a4HeaderText: event.target.value }))}
              />
              <Textarea
                label={t('sales.fields.a4Footer')}
                rows={4}
                value={draft.a4FooterText ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, a4FooterText: event.target.value }))}
              />
              <Textarea
                label={t('sales.fields.receiptHeader')}
                rows={4}
                value={draft.receiptHeaderText ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, receiptHeaderText: event.target.value }))}
              />
              <Textarea
                label={t('sales.fields.receiptFooter')}
                rows={4}
                value={draft.receiptFooterText ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, receiptFooterText: event.target.value }))}
              />
              <Textarea
                label={t('sales.fields.customerNote')}
                rows={4}
                value={draft.noteText ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, noteText: event.target.value }))}
              />
              <Button variant="secondary" disabled={saveMutation.isPending} onClick={savePrintContent}>
                {t('sales.actions.saveText')}
              </Button>
            </div>
          </aside>

          <article className={`sales-print-preview ${layout}`} dir={i18n.dir()}>
            {layout === 'a4' ? (
              <div className="a4-sheet">
                <div className="print-head">
                  <img className="print-logo" src={logos.rafefTech} alt="Rafef Tech" />
                  <div className="print-text-block">{preview.a4HeaderText}</div>
                </div>

                <div className="print-document-meta">
                  <div>
                    <strong>{t('sales.fields.type')}</strong>
                    <div>{receipt ? getSalesDocumentLabel(t, receipt.document_type) : '—'}</div>
                  </div>
                  <div>
                    <strong>{t('sales.fields.code')}</strong>
                    <div>{receipt?.invoice_code ?? '—'}</div>
                  </div>
                  <div>
                    <strong>{t('sales.customer')}</strong>
                    <div>{receipt?.customer_name ?? t('sales.empty.customer')}</div>
                  </div>
                  <div>
                    <strong>{t('sales.fields.createdAt')}</strong>
                    <div>{formatSalesDate(receipt?.created_at, language) || '—'}</div>
                  </div>
                  <div>
                    <strong>{t('sales.total')}</strong>
                    <div>{formatSalesMoney(receipt?.total, language)}</div>
                  </div>
                </div>

                <table className="print-lines-table">
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
                    {(receipt?.lines ?? []).map((line) => (
                      <tr key={line.id}>
                        <td>{line.product_name}</td>
                        <td>{line.product_sku}</td>
                        <td>{line.quantity}</td>
                        <td>{formatSalesMoney(line.unit_price, language)}</td>
                        <td>{formatSalesMoney(line.line_total, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {preview.noteText ? (
                  <div className="print-note-box">
                    <strong>{t('sales.fields.note')}</strong>
                    <p>{preview.noteText}</p>
                  </div>
                ) : null}

                <div className="print-summary">
                  <div><span>{t('sales.subtotal')}</span><strong>{formatSalesMoney(receipt?.subtotal, language)}</strong></div>
                  <div><span>{t('sales.tax')}</span><strong>{formatSalesMoney(receipt?.tax, language)}</strong></div>
                  <div><span>{t('sales.total')}</span><strong>{formatSalesMoney(receipt?.total, language)}</strong></div>
                </div>

                <div className="print-text-block footer">{preview.a4FooterText}</div>
              </div>
            ) : (
              <div className="receipt-sheet">
                <img className="print-logo receipt-logo" src={logos.rafefTech} alt="Rafef Tech" />
                <div className="print-text-block centered">{preview.receiptHeaderText}</div>
                <div className="receipt-divider" />
                <div className="receipt-meta-line"><span>{t('sales.fields.type')}</span><span>{receipt ? getSalesDocumentLabel(t, receipt.document_type) : '—'}</span></div>
                <div className="receipt-meta-line"><span>{t('sales.fields.code')}</span><span>{receipt?.invoice_code ?? '—'}</span></div>
                <div className="receipt-meta-line"><span>{t('sales.customer')}</span><span>{receipt?.customer_name ?? t('sales.empty.customer')}</span></div>
                <div className="receipt-meta-line"><span>{t('sales.fields.date')}</span><span>{formatSalesDate(receipt?.created_at, language) || '—'}</span></div>
                <div className="receipt-meta-line total"><span>{t('sales.total')}</span><span>{formatSalesMoney(receipt?.total, language)}</span></div>
                <div className="receipt-divider" />

                <div className="receipt-items">
                  {(receipt?.lines ?? []).map((line) => (
                    <div className="receipt-item" key={line.id}>
                      <strong>{line.product_name}</strong>
                      <div className="receipt-item-row">
                        <span>{line.quantity} × {formatSalesMoney(line.unit_price, language)}</span>
                        <span>{formatSalesMoney(line.line_total, language)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="receipt-divider" />
                <div className="receipt-meta-line"><span>{t('sales.subtotal')}</span><span>{formatSalesMoney(receipt?.subtotal, language)}</span></div>
                <div className="receipt-meta-line"><span>{t('sales.tax')}</span><span>{formatSalesMoney(receipt?.tax, language)}</span></div>
                <div className="receipt-meta-line total"><span>{t('sales.total')}</span><span>{formatSalesMoney(receipt?.total, language)}</span></div>

                {preview.noteText ? (
                  <>
                    <div className="receipt-divider" />
                    <div className="receipt-note">{preview.noteText}</div>
                  </>
                ) : null}

                <div className="receipt-divider" />
                <div className="print-text-block centered footer">{preview.receiptFooterText}</div>
              </div>
            )}
          </article>
        </section>
      )}

      <style>{`
        .sales-print-page{display:grid;gap:1rem}
        .sales-print-toolbar{align-items:flex-start}
        .sales-print-toolbar h1{margin:0}
        .print-toolbar-subtitle{margin:0.3rem 0 0;color:var(--color-text-muted)}
        .sales-print-loading{padding:1rem;border-radius:20px;border:1px solid var(--theme-action-border);background:linear-gradient(145deg,var(--theme-panel-fill-start),var(--theme-panel-fill-end))}
        .sales-print-toolbar-actions{display:flex;gap:0.7rem;flex-wrap:wrap;justify-content:flex-end}
        .sales-print-shell{display:grid;grid-template-columns:360px minmax(0,1fr);gap:1rem;align-items:start}
        .sales-print-controls-card,.sales-print-preview{border:1px solid var(--theme-action-border);border-radius:24px;background:linear-gradient(145deg,var(--theme-panel-fill-start),var(--theme-panel-fill-end));box-shadow:var(--theme-panel-shadow)}
        .sales-print-controls-card{padding:1rem;display:grid;gap:0.9rem}
        .sales-print-controls-card h2{margin:0}
        .sales-print-controls-card p{margin:0.25rem 0 0;color:var(--color-text-muted)}
        .sales-print-preview{padding:1.25rem;overflow:auto}
        .a4-sheet{max-width:210mm;min-height:297mm;margin:0 auto;background:rgba(255,255,255,0.04);border-radius:22px;padding:1.8rem;display:grid;gap:1rem}
        .receipt-sheet{width:80mm;max-width:100%;margin:0 auto;background:rgba(255,255,255,0.04);border-radius:22px;padding:1.2rem;font-family:"Courier New",monospace;display:grid;gap:0.55rem}
        .print-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:1rem;align-items:center}
        .print-logo{width:88px;height:auto;object-fit:contain}
        .receipt-logo{width:70px;margin:0 auto}
        .print-text-block{white-space:pre-wrap;line-height:1.6}
        .print-text-block.centered{text-align:center}
        .print-text-block.footer{padding-top:0.6rem;border-top:1px dashed rgba(132,156,179,0.3)}
        .print-document-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;padding:1rem 0;border-top:1px solid rgba(132,156,179,0.16);border-bottom:1px solid rgba(132,156,179,0.16)}
        .print-document-meta strong{display:block;margin-bottom:0.3rem}
        .print-lines-table{width:100%;border-collapse:collapse}
        .print-lines-table th,.print-lines-table td{padding:0.75rem;border-bottom:1px solid rgba(132,156,179,0.16);text-align:start}
        .print-note-box{padding:1rem;border-radius:18px;background:rgba(255,255,255,0.05);border:1px solid rgba(132,156,179,0.16)}
        .print-note-box p{margin:0.45rem 0 0}
        .print-summary{margin-inline-start:auto;max-width:320px;display:grid;gap:0.45rem}
        .print-summary > div,.receipt-meta-line{display:flex;justify-content:space-between;gap:1rem}
        .print-summary > div{padding:0.7rem 0.85rem;border-radius:14px;background:rgba(255,255,255,0.05)}
        .receipt-divider{border-top:1px dashed rgba(132,156,179,0.4);margin:0.25rem 0}
        .receipt-items{display:grid;gap:0.7rem}
        .receipt-item{display:grid;gap:0.2rem}
        .receipt-item-row{display:flex;justify-content:space-between;gap:1rem}
        .receipt-meta-line.total{font-weight:800;font-size:1.05rem}
        .receipt-note{white-space:pre-wrap;line-height:1.5}
        .notice.error{padding:0.95rem 1rem;border-radius:18px;border:1px solid rgba(220,76,100,0.3);background:rgba(220,76,100,0.12)}
        @media (max-width: 1100px){
          .sales-print-shell{grid-template-columns:1fr}
        }
        @media (max-width: 720px){
          .print-head,.print-document-meta{grid-template-columns:1fr}
          .print-logo{width:76px}
        }
        @media print{
          @page{margin:10mm}
          .sales-print-toolbar,.sales-print-controls,.notice.error{display:none !important}
          .sales-print-page{display:block;background:#fff;color:#000}
          .sales-print-preview{box-shadow:none;border:none;background:#fff;padding:0;overflow:visible}
          .a4-sheet,.receipt-sheet{background:#fff;color:#000;box-shadow:none;border:none}
          .a4-sheet{width:210mm;min-height:auto;padding:12mm}
          .receipt-sheet{width:72mm;padding:0}
          .print-summary > div,.print-note-box{background:none;border-color:#c9ced6}
        }
      `}</style>
    </div>
  );
}
