import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { repairApi } from '../../modules/repair/api/repair.api';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { Button } from '../../shared/ui/Button';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { useForm } from 'react-hook-form';

export function OrderDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [serviceName, setServiceName] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [partProductId, setPartProductId] = useState<number | ''>('');
  const [partQty, setPartQty] = useState(1);
  const [reservationResult, setReservationResult] = useState<any>(null);
  const form = useForm({ defaultValues: { noteText: '' } });

  const orderQuery = useQuery({ queryKey: ['repairOrder', id], queryFn: () => repairApi.getOrder(Number(id)) });
  const productsQuery = useQuery({ queryKey: ['products', productSearch], queryFn: () => catalogApi.listProducts(productSearch) });

  const addServiceMutation = useMutation({ mutationFn: (payload: any) => repairApi.addService(Number(id), payload), onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['repairOrder', id] }) });
  const addPartMutation = useMutation({ mutationFn: (payload: any) => repairApi.addPart(Number(id), payload), onSuccess: async (res: any) => { await queryClient.invalidateQueries({ queryKey: ['repairOrder', id] }); setReservationResult(res); } });
  const changeStatusMutation = useMutation({ mutationFn: (payload: any) => repairApi.changeStatus(Number(id), payload), onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['repairOrder', id] }) });
  const addNoteMutation = useMutation({ mutationFn: (payload: any) => repairApi.addNote(Number(id), payload), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['repairOrder', id] }); form.reset(); } });

  if (!id) return null;

  const order = orderQuery.data?.order;

  return (
    <>
      <header className="page-header"><div><p className="eyebrow">Repair</p><h1>Repair Order {order?.order_code ?? id}</h1></div></header>
      <section className="stack">
        <div><strong>Status:</strong> {order?.status}</div>
        <div><strong>Customer:</strong> {order?.customer_name ?? order?.customer_id}</div>
        <div><strong>Device:</strong> {order?.device_name ?? order?.device_id}</div>
        <div><strong>Problem:</strong> {order?.problem_description}</div>

        <hr />
        <h3>Services</h3>
        <ul>{(order?.services ?? []).map((s: any) => <li key={s.id}>{s.service_name_snapshot} × {s.quantity} ({s.unit_price_snapshot})</li>)}</ul>
        <label>Service name<input value={serviceName} onChange={(e) => setServiceName(e.target.value)} /></label>
        <Button onClick={() => { if (!serviceName) return alert('Service name required'); addServiceMutation.mutate({ serviceName, quantity: 1 }); setServiceName(''); }}>Add Service</Button>

        <hr />
        <h3>Parts</h3>
        <ul>{(order?.parts ?? []).map((p: any) => <li key={p.id}>{p.product_name_snapshot} × {p.quantity}</li>)}</ul>
        <label>Product<SearchInput placeholder="Search products by SKU or name" value={productSearch} onChange={(e) => setProductSearch((e.target as HTMLInputElement).value)} /></label>
        <label>Part product<select value={partProductId as any} onChange={(e) => setPartProductId(Number(e.target.value) || '')}>
          <option value="">-- select product --</option>
          {(productsQuery.data?.items ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.sku} {p.default_name}</option>)}
        </select></label>
        <label>Qty<input type="number" min={1} value={partQty} onChange={(e) => setPartQty(Number(e.target.value))} /></label>
        <Button onClick={() => { if (!partProductId) return alert('Select a product'); if (partQty < 1) return alert('Quantity must be at least 1'); addPartMutation.mutate({ productId: Number(partProductId), quantity: Number(partQty) }); }}>Add Part</Button>
        {reservationResult && (
          <div className="notice">
            Reservation created: id {reservationResult.part?.reservation_id ?? reservationResult.part?.reservationId ?? 'n/a'} — quantity {reservationResult.part?.quantity ?? 'n/a'}
          </div>
        )}

        <hr />
        <h3>Status</h3>
        <select defaultValue="new" onChange={(e) => changeStatusMutation.mutate({ status: e.target.value })}>
          <option value="new">new</option>
          <option value="inspection">inspection</option>
          <option value="waiting_customer_approval">waiting_customer_approval</option>
          <option value="waiting_part">waiting_part</option>
          <option value="in_repair">in_repair</option>
          <option value="ready_for_delivery">ready_for_delivery</option>
          <option value="delivered">delivered</option>
          <option value="cancelled">cancelled</option>
        </select>

        <hr />
        <h3>Notes</h3>
        <ul>{(order?.notes ?? []).map((n: any) => <li key={n.id}>{n.note_text}</li>)}</ul>
        <form onSubmit={form.handleSubmit((v) => addNoteMutation.mutate({ noteText: v.noteText }))} className="stack">
          <textarea {...form.register('noteText', { required: true, minLength: 3 })} />
          <div className="actions"><Button type="submit">Add Note</Button></div>
        </form>

        <hr />
        <Button onClick={() => { window.location.href = `/repair/orders/${id}/receipt`; }}>View Receipt</Button>
      </section>
    </>
  );
}
