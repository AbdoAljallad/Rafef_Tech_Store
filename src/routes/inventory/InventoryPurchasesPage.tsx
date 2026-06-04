import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { inventoryApi } from '../../modules/inventory/api/inventory.api';
import type { Purchase } from '../../modules/inventory/types/inventory.types';
import { inventoryErrorMessage } from '../../modules/inventory/utils/inventoryErrors';
import {
  purchaseFormSchema,
  receivePurchaseSchema,
  type PurchaseFormValues,
  type ReceivePurchaseValues,
} from '../../modules/inventory/validators/inventory.schemas';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { StatusBadge } from '../../shared/components/StatusBadge/StatusBadge';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

export function InventoryPurchasesPage() {
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => catalogApi.listProducts() });
  const productsById = new Map((productsQuery.data?.items ?? []).map((product) => [product.id, product]));
  const createMutation = useMutation({
    mutationFn: inventoryApi.createPurchase,
    onSuccess: (response) => {
      setLastPurchase(response.purchase);
      setMessage(`Закупка #${response.purchase.id} создана. Теперь ее можно принять на склад.`);
      setError('');
      receiveForm.setValue('purchaseId', response.purchase.id);
    },
    onError: (mutationError) => setError(inventoryErrorMessage(mutationError)),
  });
  const receiveMutation = useMutation({
    mutationFn: inventoryApi.receivePurchase,
    onSuccess: async (response) => {
      setLastPurchase(response.purchase);
      setMessage(`Закупка #${response.purchase.id} принята. Остатки обновлены.`);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
    },
    onError: (mutationError) => setError(inventoryErrorMessage(mutationError)),
  });
  const createForm = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema) as unknown as Resolver<PurchaseFormValues>,
    defaultValues: { supplierId: null, productId: 0, quantity: 1, unitCost: 0, notes: '' },
  });
  const receiveForm = useForm<ReceivePurchaseValues>({
    resolver: zodResolver(receivePurchaseSchema) as unknown as Resolver<ReceivePurchaseValues>,
    defaultValues: { purchaseId: 0 },
  });

  async function createPurchase(values: PurchaseFormValues) {
    await createMutation.mutateAsync({
      supplierId: values.supplierId ?? null,
      notes: values.notes,
      lines: [{ productId: values.productId, quantity: values.quantity, unitCost: values.unitCost }],
    });
  }

  async function receivePurchase(values: ReceivePurchaseValues) {
    await receiveMutation.mutateAsync(values.purchaseId);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Закупки</h1>
        </div>
        <Link to="/inventory/stock">К остаткам</Link>
      </header>

      {error ? <section className="form-error">{error}</section> : null}
      {message ? <section className="panel">{message}</section> : null}

      <section className="detail-grid">
        <article className="panel">
          <h2>Создать закупку</h2>
          <PermissionGate permission="inventory.purchases.manage">
            <form className="entity-form" onSubmit={createForm.handleSubmit(createPurchase)}>
              <Input label="ID поставщика (необязательно)" type="number" error={createForm.formState.errors.supplierId?.message} {...createForm.register('supplierId')} />
              <Select label="Товар" error={createForm.formState.errors.productId?.message} {...createForm.register('productId')}>
                <option value={0}>Выберите товар</option>
                {(productsQuery.data?.items ?? []).map((product) => (
                  <option key={product.id} value={product.id}>{product.sku} - {product.default_name}</option>
                ))}
              </Select>
              <Input label="Количество" type="number" step="0.0001" error={createForm.formState.errors.quantity?.message} {...createForm.register('quantity')} />
              <Input label="Себестоимость за единицу" type="number" step="0.01" error={createForm.formState.errors.unitCost?.message} {...createForm.register('unitCost')} />
              <Textarea label="Примечание" {...createForm.register('notes')} />
              <Button type="submit" isLoading={createMutation.isPending}>Создать закупку</Button>
            </form>
          </PermissionGate>
        </article>

        <aside className="panel entity-actions">
          <h2>Приемка</h2>
          <PermissionGate permission="inventory.purchases.manage">
            <form className="entity-form" onSubmit={receiveForm.handleSubmit(receivePurchase)}>
              <Input label="ID закупки" type="number" error={receiveForm.formState.errors.purchaseId?.message} {...receiveForm.register('purchaseId')} />
              <Button type="submit" isLoading={receiveMutation.isPending}>Принять на склад</Button>
            </form>
          </PermissionGate>
        </aside>
      </section>

      {lastPurchase ? (
        <section className="panel">
          <h2>Закупка #{lastPurchase.id}</h2>
          <p><strong>Статус:</strong> <StatusBadge domain="inventoryPurchase" status={lastPurchase.status} /></p>
          <DataTable
            rows={lastPurchase.lines}
            getRowKey={(line) => line.id}
            emptyText="Строки закупки не найдены"
            columns={[
              { key: 'product', header: 'Товар', render: (line) => productsById.get(line.product_id)?.default_name ?? line.product_id },
              { key: 'quantity', header: 'Количество', render: (line) => line.quantity },
              { key: 'cost', header: 'Себестоимость', render: (line) => <MoneyDisplay value={line.unit_cost} /> },
              { key: 'received', header: 'Принято', render: (line) => line.received_quantity },
            ]}
          />
        </section>
      ) : null}
    </>
  );
}
