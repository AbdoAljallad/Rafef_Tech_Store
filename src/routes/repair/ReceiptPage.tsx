import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { repairApi } from '../../modules/repair/api/repair.api';

export function ReceiptPage() {
  const { id } = useParams();
  const receiptQuery = useQuery({ queryKey: ['repairReceipt', id], queryFn: () => repairApi.receipt(Number(id)) });
  const r = receiptQuery.data?.receipt;

  if (!id) return null;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Repair Receipt #{r?.order?.order_code ?? id}</h1>
        <div>
          <button onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <section>
        <h2>Customer</h2>
        <div>{r?.customer_name} ({r?.customer_code})</div>
        <h2>Device</h2>
        <div>{r?.device_name}</div>
        <h2>Services</h2>
        <ul>{(r?.services ?? []).map((s: any) => <li key={s.id}>{s.service_name_snapshot} — {s.quantity} × {s.unit_price_snapshot}</li>)}</ul>
        <h2>Parts</h2>
        <ul>{(r?.parts ?? []).map((p: any) => <li key={p.id}>{p.product_name_snapshot} — {p.quantity} × {p.unit_price_snapshot} (reservation: {p.reservation_id ?? p.reservationId ?? '-'})</li>)}</ul>
        <h2>Totals</h2>
        <div>Subtotal: {r?.totals?.subtotal ?? '-'}</div>
        <div>Tax: {r?.totals?.tax ?? '-'}</div>
        <div><strong>Total: {r?.totals?.total ?? '-'}</strong></div>
      </section>

      <style>{`@media print { button { display: none; } }`}</style>
    </div>
  );
}
