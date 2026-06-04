import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { inventoryApi } from '../../modules/inventory/api/inventory.api';
import type { Reservation } from '../../modules/inventory/types/inventory.types';
import { inventoryErrorMessage } from '../../modules/inventory/utils/inventoryErrors';
import {
  reservationActionSchema,
  reservationFormSchema,
  type ReservationActionValues,
  type ReservationFormValues,
} from '../../modules/inventory/validators/inventory.schemas';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { StatusBadge } from '../../shared/components/StatusBadge/StatusBadge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

export function InventoryReservationsPage() {
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => catalogApi.listProducts() });
  const createMutation = useMutation({
    mutationFn: inventoryApi.createReservation,
    onSuccess: async (response) => {
      setLastReservation(response.reservation);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
    },
    onError: (mutationError) => setError(inventoryErrorMessage(mutationError)),
  });
  const consumeMutation = useMutation({
    mutationFn: inventoryApi.consumeReservation,
    onSuccess: async (response) => {
      setLastReservation(response.reservation);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
    },
    onError: (mutationError) => setError(inventoryErrorMessage(mutationError)),
  });
  const releaseMutation = useMutation({
    mutationFn: inventoryApi.releaseReservation,
    onSuccess: async (response) => {
      setLastReservation(response.reservation);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
    },
    onError: (mutationError) => setError(inventoryErrorMessage(mutationError)),
  });
  const createForm = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema) as unknown as Resolver<ReservationFormValues>,
    defaultValues: { productId: 0, quantity: 1, sourceType: 'manual_admin', sourceId: 1, notes: '' },
  });
  const consumeForm = useForm<ReservationActionValues>({
    resolver: zodResolver(reservationActionSchema) as unknown as Resolver<ReservationActionValues>,
    defaultValues: { reservationId: 0 },
  });
  const releaseForm = useForm<ReservationActionValues>({
    resolver: zodResolver(reservationActionSchema) as unknown as Resolver<ReservationActionValues>,
    defaultValues: { reservationId: 0 },
  });

  async function createReservation(values: ReservationFormValues) {
    await createMutation.mutateAsync(values);
  }

  async function consume(values: ReservationActionValues) {
    await consumeMutation.mutateAsync(values.reservationId);
  }

  async function release(values: ReservationActionValues) {
    await releaseMutation.mutateAsync(values.reservationId);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Резервы склада</h1>
        </div>
        <Link to="/inventory/stock">К остаткам</Link>
      </header>

      <section className="panel inventory-warning">
        Ручное создание резервов временно доступно только для разработки и администрирования, пока модули ремонта, проектов и продаж не подключены.
      </section>

      {error ? <section className="form-error">{error}</section> : null}

      <section className="detail-grid">
        <article className="panel">
          <h2>Создать резерв</h2>
          <PermissionGate permission="inventory.reservations.manage">
            <form className="entity-form" onSubmit={createForm.handleSubmit(createReservation)}>
              <Select label="Товар" error={createForm.formState.errors.productId?.message} {...createForm.register('productId')}>
                <option value={0}>Выберите товар</option>
                {(productsQuery.data?.items ?? []).map((product) => (
                  <option key={product.id} value={product.id}>{product.sku} - {product.default_name}</option>
                ))}
              </Select>
              <Input label="Количество" type="number" step="0.0001" error={createForm.formState.errors.quantity?.message} {...createForm.register('quantity')} />
              <Input label="Тип источника" error={createForm.formState.errors.sourceType?.message} {...createForm.register('sourceType')} />
              <Input label="ID источника" type="number" error={createForm.formState.errors.sourceId?.message} {...createForm.register('sourceId')} />
              <Textarea label="Примечание" {...createForm.register('notes')} />
              <Button type="submit" isLoading={createMutation.isPending}>Создать резерв</Button>
            </form>
          </PermissionGate>
        </article>

        <aside className="panel entity-actions">
          <h2>Действия с резервом</h2>
          <PermissionGate permission="inventory.reservations.manage">
            <form className="entity-form" onSubmit={consumeForm.handleSubmit(consume)}>
              <Input label="ID резерва для списания" type="number" error={consumeForm.formState.errors.reservationId?.message} {...consumeForm.register('reservationId')} />
              <Button type="submit" variant="danger" isLoading={consumeMutation.isPending}>Списать резерв</Button>
            </form>
            <form className="entity-form" onSubmit={releaseForm.handleSubmit(release)}>
              <Input label="ID резерва для освобождения" type="number" error={releaseForm.formState.errors.reservationId?.message} {...releaseForm.register('reservationId')} />
              <Button type="submit" variant="secondary" isLoading={releaseMutation.isPending}>Освободить резерв</Button>
            </form>
          </PermissionGate>
        </aside>
      </section>

      {lastReservation ? (
        <section className="panel entity-summary">
          <h2>Последний резерв #{lastReservation.id}</h2>
          <p><strong>Статус:</strong> <StatusBadge domain="inventoryReservation" status={lastReservation.status} /></p>
          <p><strong>Товар:</strong> {lastReservation.product_id}</p>
          <p><strong>Количество:</strong> {lastReservation.quantity}</p>
          <p><strong>Источник:</strong> {lastReservation.source_type} #{lastReservation.source_id}</p>
        </section>
      ) : null}
    </>
  );
}
