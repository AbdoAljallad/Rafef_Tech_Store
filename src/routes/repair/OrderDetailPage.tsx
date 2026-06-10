import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { repairApi } from '../../modules/repair/api/repair.api';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { Button } from '../../shared/ui/Button';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { useForm } from 'react-hook-form';

const statusOptions = ['new', 'inspection', 'waiting_customer_approval', 'waiting_part', 'in_repair', 'ready_for_delivery', 'delivered', 'cancelled'] as const;

export function OrderDetailPage() {
  const { t } = useTranslation(['app', 'statuses']);
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
  const currentStatusLabel = order?.status ? String(t(`statuses:repair.${order.status}`)) : '-';

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('repair.module')}</p>
          <h1>{t('repair.orderTitle', { code: order?.order_code ?? id })}</h1>
        </div>
      </header>
      <section className="stack">
        <div><strong>{t('repair.status')}:</strong> {currentStatusLabel}</div>
        <div><strong>{t('repair.customer')}:</strong> {order?.customer_name ?? order?.customer_id}</div>
        <div><strong>{t('repair.device')}:</strong> {order?.device_name ?? order?.device_id}</div>
        <div><strong>{t('repair.problem')}:</strong> {order?.problem_description}</div>

        <hr />
        <h3>{t('repair.services')}</h3>
        <ul>{(order?.services ?? []).map((service: any) => <li key={service.id}>{service.service_name_snapshot} × {service.quantity} ({service.unit_price_snapshot})</li>)}</ul>
        <label>
          {t('repair.serviceName')}
          <input value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
        </label>
        <Button onClick={() => { if (!serviceName) return alert(t('repair.serviceNameRequired')); addServiceMutation.mutate({ serviceName, quantity: 1 }); setServiceName(''); }}>
          {t('repair.addService')}
        </Button>

        <hr />
        <h3>{t('repair.parts')}</h3>
        <ul>{(order?.parts ?? []).map((part: any) => <li key={part.id}>{part.product_name_snapshot} × {part.quantity}</li>)}</ul>
        <label>
          {t('repair.product')}
          <SearchInput placeholder={t('repair.searchProducts')} value={productSearch} onChange={(e) => setProductSearch((e.target as HTMLInputElement).value)} />
        </label>
        <label>
          {t('repair.partProduct')}
          <select value={partProductId as any} onChange={(e) => setPartProductId(Number(e.target.value) || '')}>
            <option value="">{t('repair.selectProduct')}</option>
            {(productsQuery.data?.items ?? []).map((product: any) => <option key={product.id} value={product.id}>{product.sku} {product.default_name}</option>)}
          </select>
        </label>
        <label>
          {t('repair.qty')}
          <input type="number" min={1} value={partQty} onChange={(e) => setPartQty(Number(e.target.value))} />
        </label>
        <Button onClick={() => { if (!partProductId) return alert(t('repair.productRequired')); if (partQty < 1) return alert(t('repair.quantityMin')); addPartMutation.mutate({ productId: Number(partProductId), quantity: Number(partQty) }); }}>
          {t('repair.addPart')}
        </Button>
        {reservationResult ? (
          <div className="notice">
            {t('repair.reservationCreated', {
              reservationId: reservationResult.part?.reservation_id ?? reservationResult.part?.reservationId ?? 'n/a',
              quantity: reservationResult.part?.quantity ?? 'n/a',
            })}
          </div>
        ) : null}

        <hr />
        <h3>{t('repair.status')}</h3>
        <select defaultValue="new" onChange={(e) => changeStatusMutation.mutate({ status: e.target.value })}>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {String(t(`statuses:repair.${status}`))}
            </option>
          ))}
        </select>

        <hr />
        <h3>{t('repair.notes')}</h3>
        <ul>{(order?.notes ?? []).map((note: any) => <li key={note.id}>{note.note_text}</li>)}</ul>
        <form onSubmit={form.handleSubmit((values) => addNoteMutation.mutate({ noteText: values.noteText }))} className="stack">
          <textarea {...form.register('noteText', { required: true, minLength: 3 })} />
          <div className="actions"><Button type="submit">{t('repair.addNote')}</Button></div>
        </form>

        <hr />
        <Button onClick={() => { window.location.href = `/repair/orders/${id}/receipt`; }}>{t('repair.viewReceipt')}</Button>
      </section>
    </>
  );
}
