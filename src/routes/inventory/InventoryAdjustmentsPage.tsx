import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { getAvailableQuantity, hasAvailableStock } from '../../modules/catalog/utils/stockAvailability';
import { inventoryApi } from '../../modules/inventory/api/inventory.api';
import type { Adjustment } from '../../modules/inventory/types/inventory.types';
import { inventoryErrorMessage } from '../../modules/inventory/utils/inventoryErrors';
import { adjustmentFormSchema, type AdjustmentFormValues } from '../../modules/inventory/validators/inventory.schemas';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

export function InventoryAdjustmentsPage() {
  const { t, i18n } = useTranslation('app');
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
  const [pendingValues, setPendingValues] = useState<AdjustmentFormValues | null>(null);
  const [lastAdjustment, setLastAdjustment] = useState<Adjustment | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => catalogApi.listProducts() });
  const products = productsQuery.data?.items ?? [];
  const productsById = new Map(products.map((product) => [product.id, product]));
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema) as unknown as Resolver<AdjustmentFormValues>,
    defaultValues: { productId: 0, direction: 'in', quantity: 1, unitCost: 0, reason: '', notes: '' },
  });
  const mutation = useMutation({
    mutationFn: inventoryApi.createAdjustment,
    onSuccess: async (response) => {
      setLastAdjustment(response.adjustment);
      setError('');
      setPendingValues(null);
      form.reset({ productId: 0, direction: 'in', quantity: 1, unitCost: 0, reason: '', notes: '' });
      await queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (mutationError) => {
      setError(inventoryErrorMessage(mutationError));
      setPendingValues(null);
    },
  });
  const selectedProductId = Number(form.watch('productId'));
  const direction = form.watch('direction');
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  function requestConfirmation(values: AdjustmentFormValues) {
    if (values.direction === 'out') {
      if (!selectedProduct || !hasAvailableStock(selectedProduct)) {
        setError(t('inventory.errors.outboundUnavailable'));
        return;
      }

      const available = getAvailableQuantity(selectedProduct);
      if (values.quantity > available) {
        setError(t('inventory.errors.quantityExceedsAvailable', { count: available }));
        return;
      }
    }

    setError('');
    setPendingValues(values);
  }

  async function confirmAdjustment() {
    if (!pendingValues) {
      return;
    }

    await mutation.mutateAsync({
      reason: pendingValues.reason,
      notes: pendingValues.notes,
      lines: [
        {
          productId: pendingValues.productId,
          direction: pendingValues.direction,
          quantity: pendingValues.quantity,
          unitCost: pendingValues.unitCost ?? null,
          notes: pendingValues.notes,
        },
      ],
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('inventory.module')}</p>
          <h1>{t('inventory.adjustments')}</h1>
        </div>
        <Link to="/inventory/stock">{t('inventory.backToStock')}</Link>
      </header>

      {error ? <section className="form-error">{error}</section> : null}

      <section className="panel narrow">
        <h2>{t('inventory.adjustmentsPage.newTitle')}</h2>
        <PermissionGate permission="inventory.stock.adjust">
          <form className="entity-form" onSubmit={form.handleSubmit(requestConfirmation)}>
            <Select label={t('inventory.product')} error={form.formState.errors.productId?.message} {...form.register('productId')}>
              <option value={0}>{t('inventory.selectProduct')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id} disabled={direction === 'out' && !hasAvailableStock(product)}>
                  {product.sku} - {product.default_name} - {t('inventory.available')}: {getAvailableQuantity(product).toLocaleString(locale, { maximumFractionDigits: 4 })}
                </option>
              ))}
            </Select>
            <Select label={t('inventory.direction')} {...form.register('direction')}>
              <option value="in">{t('inventory.adjustmentsPage.directionIn')}</option>
              <option value="out">{t('inventory.adjustmentsPage.directionOut')}</option>
            </Select>
            <Input label={t('inventory.quantity')} type="number" step="0.0001" error={form.formState.errors.quantity?.message} {...form.register('quantity')} />
            <Input label={t('inventory.unitCost')} type="number" step="0.01" error={form.formState.errors.unitCost?.message} {...form.register('unitCost')} />
            <Input label={t('inventory.reason')} error={form.formState.errors.reason?.message} {...form.register('reason')} />
            <Textarea label={t('inventory.notes')} {...form.register('notes')} />
            <Button type="submit" variant="danger" disabled={direction === 'out' && selectedProduct ? !hasAvailableStock(selectedProduct) : false}>
              {t('inventory.adjustmentsPage.submit')}
            </Button>
          </form>
        </PermissionGate>
      </section>

      {lastAdjustment ? (
        <section className="panel entity-summary">
          <h2>{t('inventory.adjustmentsPage.lastTitle', { id: lastAdjustment.id })}</h2>
          <p>
            <strong>{t('inventory.reason')}:</strong> {lastAdjustment.reason}
          </p>
          {lastAdjustment.lines.map((line) => (
            <p key={line.id}>
              <Badge tone={line.direction === 'in' ? 'success' : 'danger'}>
                {line.direction === 'in' ? t('inventory.adjustmentsPage.directionIn') : t('inventory.adjustmentsPage.directionOut')}
              </Badge>{' '}
              {productsById.get(line.product_id)?.default_name ?? line.product_id}: {Number(line.quantity).toLocaleString(locale, { maximumFractionDigits: 4 })}
              {line.unit_cost ? (
                <>
                  {' '}
                  · <MoneyDisplay value={line.unit_cost} />
                </>
              ) : null}
            </p>
          ))}
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(pendingValues)}
        title={t('inventory.adjustmentsPage.confirmTitle')}
        message={t('inventory.adjustmentsPage.confirmMessage')}
        confirmLabel={mutation.isPending ? t('inventory.adjustmentsPage.applying') : t('inventory.adjustmentsPage.apply')}
        onCancel={() => setPendingValues(null)}
        onConfirm={() => void confirmAdjustment()}
      />
    </>
  );
}
