import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { salesApi } from '../../modules/sales/api/sales.api';

export function SalesReceiptPage() {
  const { id } = useParams();
  const receiptQuery = useQuery({ queryKey: ['salesReceipt', id], queryFn: () => salesApi.getInvoice(Number(id)) });
  const r = receiptQuery.data?.invoice;
  if (!id) return null;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Sales Receipt #{r?.invoice_code ?? id}</h1>
        <button onClick={() => window.print()}>Print</button>
      </div>
      <section>
        <h2>Customer</h2>
        <div>{r?.customer_id ?? 'Walk-in'}</div>
        <h2>Lines</h2>
        <ul>{(r?.lines ?? []).map((l: any) => <li key={l.id}>{l.product_id} — {l.quantity} × {l.unit_price}</li>)}</ul>
        <h2>Totals</h2>
        <div>Subtotal: {r?.subtotal ?? '-'}</div>
        <div>Tax: {r?.tax ?? '-'}</div>
        <div><strong>Total: {r?.total ?? '-'}</strong></div>
      </section>
    </div>
  );
}
