import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { repairApi } from '../../modules/repair/api/repair.api';

export function ReceiptPage() {
  const { t } = useTranslation('app');
  const { id } = useParams();
  const receiptQuery = useQuery({ queryKey: ['repairReceipt', id], queryFn: () => repairApi.receipt(Number(id)) });
  const receipt = receiptQuery.data?.receipt;

  if (!id) return null;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('repair.receiptTitle', { code: receipt?.order?.order_code ?? id })}</h1>
        <div>
          <button onClick={() => window.print()}>{t('repair.print')}</button>
        </div>
      </div>

      <section>
        <h2>{t('repair.customerSection')}</h2>
        <div>{receipt?.customer_name} ({receipt?.customer_code})</div>
        <h2>{t('repair.deviceSection')}</h2>
        <div>{receipt?.device_name}</div>
        <h2>{t('repair.servicesSection')}</h2>
        <ul>{(receipt?.services ?? []).map((service: any) => <li key={service.id}>{service.service_name_snapshot} — {service.quantity} × {service.unit_price_snapshot}</li>)}</ul>
        <h2>{t('repair.partsSection')}</h2>
        <ul>{(receipt?.parts ?? []).map((part: any) => <li key={part.id}>{part.product_name_snapshot} — {part.quantity} × {part.unit_price_snapshot} (reservation: {part.reservation_id ?? part.reservationId ?? '-'})</li>)}</ul>
        <h2>{t('repair.totals')}</h2>
        <div>{t('repair.subtotal')}: {receipt?.totals?.subtotal ?? '-'}</div>
        <div>{t('repair.tax')}: {receipt?.totals?.tax ?? '-'}</div>
        <div><strong>{t('repair.total')}: {receipt?.totals?.total ?? '-'}</strong></div>
      </section>

      <style>{`@media print { button { display: none; } }`}</style>
    </div>
  );
}
