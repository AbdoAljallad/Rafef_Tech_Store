import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { getAvailableQuantity, hasAvailableStock } from '../../modules/catalog/utils/stockAvailability';
import { inventoryApi } from '../../modules/inventory/api/inventory.api';
import type { Reservation } from '../../modules/inventory/types/inventory.types';
import { inventoryErrorMessage } from '../../modules/inventory/utils/inventoryErrors';
import {
  reservationActionSchema,
  reservationFormSchema,
  type ReservationActionValues,
  type ReservationFormValues,
} from '../../modules/inventory/validators/inventory.schemas';
import { StatusBadge } from '../../shared/components/StatusBadge/StatusBadge';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

export function InventoryReservationsPage() {
  const { t, i18n } = useTranslation('app');
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => catalogApi.listProducts() });
  const products = productsQuery.data?.items ?? [];
  const createMutation = useMutation({
    mutationFn: inventoryApi.createReservation,
    onSuccess: async (response) => {
      setLastReservation(response.reservation);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (mutationError) => setError(inventoryErrorMessage(mutationError)),
  });
  const consumeMutation = useMutation({
    mutationFn: inventoryApi.consumeReservation,
    onSuccess: async (response) => {
      setLastReservation(response.reservation);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (mutationError) => setError(inventoryErrorMessage(mutationError)),
  });
  const releaseMutation = useMutation({
    mutationFn: inventoryApi.releaseReservation,
    onSuccess: async (response) => {
      setLastReservation(response.reservation);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
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
  const selectedProductId = Number(createForm.watch('productId'));
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  async function createReservation(values: ReservationFormValues) {
    if (!selectedProduct || !hasAvailableStock(selectedProduct)) {
      setError(t('inventory.errors.unavailable'));
      return;
    }

    const available = getAvailableQuantity(selectedProduct);
    if (values.quantity > available) {
      setError(t('inventory.errors.quantityExceedsAvailable', { count: available }));
      return;
    }

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
          <p className="eyebrow">{t('inventory.module')}</p>
          <h1>{t('inventory.reservations')}</h1>
        </div>
        <Link to="/inventory/stock">{t('inventory.backToStock')}</Link>
      </header>

      <section className="panel inventory-warning">{t('inventory.reservationsPage.warning')}</section>

      {error ? <section className="form-error">{error}</section> : null}

      <section className="detail-grid">
        <article className="panel">
          <h2>{t('inventory.reservationsPage.createTitle')}</h2>
          <PermissionGate permission="inventory.reservations.manage">
            <form className="entity-form" onSubmit={createForm.handleSubmit(createReservation)}>
              <Select label={t('inventory.product')} error={createForm.formState.errors.productId?.message} {...createForm.register('productId')}>
                <option value={0}>{t('inventory.selectProduct')}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id} disabled={!hasAvailableStock(product)}>
                    {product.sku} - {product.default_name} - {t('inventory.available')}: {getAvailableQuantity(product).toLocaleString(locale, { maximumFractionDigits: 4 })}
                  </option>
                ))}
              </Select>
              <Input label={t('inventory.quantity')} type="number" step="0.0001" error={createForm.formState.errors.quantity?.message} {...createForm.register('quantity')} />
              <Input label={t('inventory.reservationsPage.sourceType')} error={createForm.formState.errors.sourceType?.message} {...createForm.register('sourceType')} />
              <Input label={t('inventory.reservationsPage.sourceId')} type="number" error={createForm.formState.errors.sourceId?.message} {...createForm.register('sourceId')} />
              <Textarea label={t('inventory.notes')} {...createForm.register('notes')} />
              <Button type="submit" isLoading={createMutation.isPending} disabled={selectedProduct ? !hasAvailableStock(selectedProduct) : false}>
                {t('inventory.reservationsPage.createSubmit')}
              </Button>
            </form>
          </PermissionGate>
        </article>

        <aside className="panel entity-actions">
          <h2>{t('inventory.reservationsPage.actionsTitle')}</h2>
          <PermissionGate permission="inventory.reservations.manage">
            <form className="entity-form" onSubmit={consumeForm.handleSubmit(consume)}>
              <Input label={t('inventory.reservationsPage.consumeId')} type="number" error={consumeForm.formState.errors.reservationId?.message} {...consumeForm.register('reservationId')} />
              <Button type="submit" variant="danger" isLoading={consumeMutation.isPending}>
                {t('inventory.reservationsPage.consumeSubmit')}
              </Button>
            </form>
            <form className="entity-form" onSubmit={releaseForm.handleSubmit(release)}>
              <Input label={t('inventory.reservationsPage.releaseId')} type="number" error={releaseForm.formState.errors.reservationId?.message} {...releaseForm.register('reservationId')} />
              <Button type="submit" variant="secondary" isLoading={releaseMutation.isPending}>
                {t('inventory.reservationsPage.releaseSubmit')}
              </Button>
            </form>
          </PermissionGate>
        </aside>
      </section>

      {lastReservation ? (
        <section className="panel entity-summary">
          <h2>{t('inventory.reservationsPage.lastTitle', { id: lastReservation.id })}</h2>
          <p>
            <strong>{t('inventory.status')}:</strong> <StatusBadge domain="inventoryReservation" status={lastReservation.status} />
          </p>
          <p>
            <strong>{t('inventory.product')}:</strong> {lastReservation.product_id}
          </p>
          <p>
            <strong>{t('inventory.quantity')}:</strong> {Number(lastReservation.quantity).toLocaleString(locale, { maximumFractionDigits: 4 })}
          </p>
          <p>
            <strong>{t('inventory.reservationsPage.sourceLabel')}:</strong> {lastReservation.source_type} #{lastReservation.source_id}
          </p>
        </section>
      ) : null}
    </>
  );
}
