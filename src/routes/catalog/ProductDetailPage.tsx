import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { ProductForm } from '../../modules/catalog/components/ProductForm';
import { priceChangeSchema, type PriceChangeValues, type ProductEditValues } from '../../modules/catalog/validators/catalog.schemas';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Textarea } from '../../shared/ui/Textarea';

type DrawerMode = 'edit' | 'price' | null;

export function ProductDetailPage() {
  const { id } = useParams();
  const productId = Number(id);
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const queryClient = useQueryClient();
  const productQuery = useQuery({ queryKey: ['products', productId], queryFn: () => catalogApi.getProduct(productId), enabled: Number.isFinite(productId) });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories });
  const unitsQuery = useQuery({ queryKey: ['units'], queryFn: catalogApi.listUnits });
  const updateMutation = useMutation({ mutationFn: (values: ProductEditValues) => catalogApi.updateProduct(productId, values), onSuccess: async () => { setDrawer(null); await queryClient.invalidateQueries({ queryKey: ['products'] }); } });
  const priceMutation = useMutation({ mutationFn: (values: PriceChangeValues) => catalogApi.changePrice(productId, values), onSuccess: async () => { setDrawer(null); await queryClient.invalidateQueries({ queryKey: ['products'] }); } });
  const product = productQuery.data?.product;

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">Catalog</p><h1>{product?.default_name ?? 'Товар'}</h1></div>
        <Link to="/catalog/products">К списку</Link>
      </header>
      {productQuery.isLoading ? <section className="panel">Загрузка...</section> : null}
      {productQuery.isError ? <section className="panel">Не удалось загрузить товар</section> : null}
      {product ? (
        <section className="detail-grid">
          <article className="panel entity-summary">
            <p><strong>SKU:</strong> {product.sku}</p>
            <p><strong>Категория:</strong> {product.category_name}</p>
            <p><strong>Единица:</strong> {product.unit_name_ru}</p>
            <p><strong>Учет:</strong> {product.tracking_type}</p>
            <p><strong>Закупка:</strong> <MoneyDisplay value={product.current_purchase_price} /></p>
            <p><strong>Продажа:</strong> <MoneyDisplay value={product.current_sale_price} /></p>
          </article>
          <article className="panel entity-actions">
            <PermissionGate permission="catalog.products.manage"><Button variant="secondary" onClick={() => setDrawer('edit')}>Редактировать</Button></PermissionGate>
            <PermissionGate permission="catalog.prices.change"><Button variant="secondary" onClick={() => setDrawer('price')}>Изменить цену</Button></PermissionGate>
          </article>
        </section>
      ) : null}
      <FormDrawer title="Редактировать товар" isOpen={drawer === 'edit'} onClose={() => setDrawer(null)}>
        {product ? <ProductForm mode="edit" product={product} categories={categoriesQuery.data?.items ?? []} units={unitsQuery.data?.items ?? []} onSubmit={(values) => updateMutation.mutateAsync(values)} isSubmitting={updateMutation.isPending} /> : null}
      </FormDrawer>
      <FormDrawer title="Изменить цену" isOpen={drawer === 'price'} onClose={() => setDrawer(null)}>
        <PriceForm onSubmit={(values) => priceMutation.mutateAsync(values)} isSubmitting={priceMutation.isPending} />
      </FormDrawer>
    </>
  );
}

function PriceForm({ onSubmit, isSubmitting }: { onSubmit: (values: PriceChangeValues) => Promise<unknown>; isSubmitting: boolean }) {
  const form = useForm({ resolver: zodResolver(priceChangeSchema), defaultValues: { newPurchasePrice: 0, newSalePrice: 0, reason: '' } });
  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as PriceChangeValues))}>
      <Input label="Новая закупочная цена" type="number" step="0.01" error={form.formState.errors.newPurchasePrice?.message} {...form.register('newPurchasePrice')} />
      <Input label="Новая цена продажи" type="number" step="0.01" error={form.formState.errors.newSalePrice?.message} {...form.register('newSalePrice')} />
      <Textarea label="Причина" {...form.register('reason')} />
      <Button type="submit" isLoading={isSubmitting}>Сохранить цену</Button>
    </form>
  );
}
