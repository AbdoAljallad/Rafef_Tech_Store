import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { repairApi } from '../../modules/repair/api/repair.api';

function money(value: number | string | null | undefined, language?: string) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function ReceiptPage() {
  const { t, i18n } = useTranslation('app');
  const { id } = useParams();
  const receiptQuery = useQuery({
    queryKey: ['repairReceipt', id],
    queryFn: () => repairApi.receipt(Number(id)),
    enabled: Boolean(id),
  });
  const receipt = receiptQuery.data?.receipt;

  if (!id) return null;

  return (
    <div className="repair-receipt-page">
      <div className="repair-receipt-toolbar">
        <h1>{t('repair.receiptTitle', { code: receipt?.order?.order_code ?? id })}</h1>
        <button type="button" onClick={() => window.print()}>{t('repair.print')}</button>
      </div>

      {receiptQuery.isError ? <div className="notice error">{t('repair.errors.generic')}</div> : null}

      <section className="repair-receipt-sheet">
        <div className="repair-receipt-grid">
          <div>
            <h2>{t('repair.customerSection')}</h2>
            <div>{receipt?.customer?.name ?? '-'}</div>
            <div className="muted">{receipt?.customer?.customer_code ?? '-'}</div>
          </div>
          <div>
            <h2>{t('repair.deviceSection')}</h2>
            <div>{receipt?.device?.device_name ?? receipt?.order?.device_name ?? '-'}</div>
            <div className="muted">{receipt?.device?.serial_no ?? receipt?.device?.imei ?? '-'}</div>
          </div>
        </div>

        <div className="repair-receipt-section">
          <h2>{t('repair.servicesSection')}</h2>
          <ul>
            {(receipt?.services ?? []).map((service: any) => (
              <li key={service.id}>
                <span>{service.service_name_snapshot}</span>
                <strong>{service.quantity} × {money(service.unit_price_snapshot, i18n.resolvedLanguage)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="repair-receipt-section">
          <h2>{t('repair.partsSection')}</h2>
          <ul>
            {(receipt?.parts ?? []).map((part: any) => (
              <li key={part.id}>
                <span>{part.product_name_snapshot}</span>
                <strong>{part.quantity} × {money(part.unit_price_snapshot, i18n.resolvedLanguage)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="repair-receipt-totals">
          <div><span>{t('repair.subtotal')}</span><strong>{money(receipt?.totals?.subtotal, i18n.resolvedLanguage)}</strong></div>
          <div><span>{t('repair.tax')}</span><strong>{money(receipt?.totals?.tax, i18n.resolvedLanguage)}</strong></div>
          <div className="total"><span>{t('repair.total')}</span><strong>{money(receipt?.totals?.total, i18n.resolvedLanguage)}</strong></div>
        </div>
      </section>

      <style>{`
        .repair-receipt-page{display:grid;gap:1rem;padding:1.25rem}
        .repair-receipt-toolbar{display:flex;justify-content:space-between;gap:1rem;align-items:center}
        .repair-receipt-toolbar h1{margin:0}
        .repair-receipt-toolbar button{padding:0.7rem 1.1rem;border-radius:14px;border:1px solid var(--theme-action-border);background:var(--theme-accent-soft);color:inherit;font:inherit;cursor:pointer}
        .repair-receipt-sheet{display:grid;gap:1rem;padding:1.4rem;border-radius:24px;border:1px solid var(--theme-action-border);background:linear-gradient(145deg,var(--theme-panel-fill-start),var(--theme-panel-fill-end));box-shadow:var(--theme-panel-shadow)}
        .repair-receipt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
        .repair-receipt-section{display:grid;gap:0.7rem}
        .repair-receipt-section h2,.repair-receipt-grid h2{margin:0 0 0.45rem}
        .repair-receipt-section ul{list-style:none;padding:0;margin:0;display:grid;gap:0.55rem}
        .repair-receipt-section li,.repair-receipt-totals>div{display:flex;justify-content:space-between;gap:1rem;padding:0.8rem 0.95rem;border-radius:16px;background:rgba(255,255,255,0.05)}
        .repair-receipt-totals{display:grid;gap:0.6rem}
        .repair-receipt-totals .total{font-size:1.05rem;font-weight:800}
        .muted{color:var(--color-text-muted)}
        @media (max-width: 720px){.repair-receipt-grid{grid-template-columns:1fr}}
        @media print{
          .repair-receipt-toolbar button{display:none}
          .repair-receipt-page{padding:0}
          .repair-receipt-sheet{box-shadow:none;border:none;background:#fff;color:#000}
        }
      `}</style>
    </div>
  );
}
