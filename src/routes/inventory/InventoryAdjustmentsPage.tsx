import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
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
  const [pendingValues, setPendingValues] = useState<AdjustmentFormValues | null>(null);
  const [lastAdjustment, setLastAdjustment] = useState<Adjustment | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => catalogApi.listProducts() });
  const productsById = new Map((productsQuery.data?.items ?? []).map((product) => [product.id, product]));
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
    },
    onError: (mutationError) => {
      setError(inventoryErrorMessage(mutationError));
      setPendingValues(null);
    },
  });

  function requestConfirmation(values: AdjustmentFormValues) {
    setPendingValues(values);
  }

  async function confirmAdjustment() {
    if (!pendingValues) return;
    await mutation.mutateAsync({
      reason: pendingValues.reason,
      notes: pendingValues.notes,
      lines: [{
        productId: pendingValues.productId,
        direction: pendingValues.direction,
        quantity: pendingValues.quantity,
        unitCost: pendingValues.unitCost ?? null,
        notes: pendingValues.notes,
      }],
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Корректировки склада</h1>
        </div>
        <Link to="/inventory/stock">К остаткам</Link>
      </header>

      {error ? <section className="form-error">{error}</section> : null}

      <section className="panel narrow">
        <h2>Новая корректировка</h2>
        <PermissionGate permission="inventory.stock.adjust">
          <form className="entity-form" onSubmit={form.handleSubmit(requestConfirmation)}>
            <Select label="Товар" error={form.formState.errors.productId?.message} {...form.register('productId')}>
              <option value={0}>Выберите товар</option>
              {(productsQuery.data?.items ?? []).map((product) => (
                <option key={product.id} value={product.id}>{product.sku} - {product.default_name}</option>
              ))}
            </Select>
            <Select label="Направление" {...form.register('direction')}>
              <option value="in">Приход</option>
              <option value="out">Списание</option>
            </Select>
            <Input label="Количество" type="number" step="0.0001" error={form.formState.errors.quantity?.message} {...form.register('quantity')} />
            <Input label="Себестоимость" type="number" step="0.01" error={form.formState.errors.unitCost?.message} {...form.register('unitCost')} />
            <Input label="Причина" error={form.formState.errors.reason?.message} {...form.register('reason')} />
            <Textarea label="Примечание" {...form.register('notes')} />
            <Button type="submit" variant="danger">Проверить и применить</Button>
          </form>
        </PermissionGate>
      </section>

      {lastAdjustment ? (
        <section className="panel entity-summary">
          <h2>Корректировка #{lastAdjustment.id}</h2>
          <p><strong>Причина:</strong> {lastAdjustment.reason}</p>
          {lastAdjustment.lines.map((line) => (
            <p key={line.id}>
              <Badge tone={line.direction === 'in' ? 'success' : 'danger'}>{line.direction === 'in' ? 'Приход' : 'Списание'}</Badge>{' '}
              {productsById.get(line.product_id)?.default_name ?? line.product_id}: {line.quantity}
              {line.unit_cost ? <> · <MoneyDisplay value={line.unit_cost} /></> : null}
            </p>
          ))}
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(pendingValues)}
        title="Подтвердить корректировку"
        message="Корректировка изменит складской остаток и создаст движение склада. Продолжить?"
        confirmLabel={mutation.isPending ? 'Применяется...' : 'Применить'}
        onCancel={() => setPendingValues(null)}
        onConfirm={() => void confirmAdjustment()}
      />
    </>
  );
}
