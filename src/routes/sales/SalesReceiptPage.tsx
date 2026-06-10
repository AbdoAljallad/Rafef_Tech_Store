import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { salesApi } from '../../modules/sales/api/sales.api';

export function SalesReceiptPage() {
  const { t } = useTranslation('app');
  const { id } = useParams();
  const receiptQuery = useQuery({ queryKey: ['salesReceipt', id], queryFn: () => salesApi.getInvoice(Number(id)) });
  const receipt = receiptQuery.data?.invoice;

  if (!id) return null;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>{t('sales.receiptTitle', { code: receipt?.invoice_code ?? id })}</h1>
        <button onClick={() => window.print()}>{t('sales.print')}</button>
      </div>
      <section>
        <h2>{t('sales.customer')}</h2>
        <div>{receipt?.customer_id ?? t('sales.walkIn')}</div>
        <h2>{t('sales.lines')}</h2>
        <ul>{(receipt?.lines ?? []).map((line: any) => <li key={line.id}>{line.product_id} — {line.quantity} × {line.unit_price}</li>)}</ul>
        <h2>{t('sales.totals')}</h2>
        <div>{t('sales.subtotal')}: {receipt?.subtotal ?? '-'}</div>
        <div>{t('sales.tax')}: {receipt?.tax ?? '-'}</div>
        <div><strong>{t('sales.total')}: {receipt?.total ?? '-'}</strong></div>
      </section>
    </div>
  );
}
