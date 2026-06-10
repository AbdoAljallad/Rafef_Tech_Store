import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { ProductForm } from '../../modules/catalog/components/ProductForm';
import { priceChangeSchema, type PriceChangeValues, type ProductEditValues } from '../../modules/catalog/validators/catalog.schemas';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

type DrawerMode = 'edit' | 'price' | null;
type SupplierLinkDraft = {
  supplierId: string;
  supplierSku: string;
  lastPurchasePrice: string;
};

export function ProductDetailPage() {
  const { t } = useTranslation(['app', 'common']);
  const { id } = useParams();
  const productId = Number(id);
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const queryClient = useQueryClient();
  const productQuery = useQuery({ queryKey: ['products', productId], queryFn: () => catalogApi.getProduct(productId), enabled: Number.isFinite(productId) });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories });
  const unitsQuery = useQuery({ queryKey: ['units'], queryFn: catalogApi.listUnits });
  const suppliersQuery = useQuery({ queryKey: ['catalog-suppliers'], queryFn: catalogApi.listSuppliers });
  const productSuppliersQuery = useQuery({
    queryKey: ['product-suppliers', productId],
    queryFn: () => catalogApi.getProductSuppliers(productId),
    enabled: Number.isFinite(productId),
  });
  const updateMutation = useMutation({
    mutationFn: (values: ProductEditValues) => catalogApi.updateProduct(productId, values),
    onSuccess: async () => {
      setDrawer(null);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
  const priceMutation = useMutation({
    mutationFn: (values: PriceChangeValues) => catalogApi.changePrice(productId, values),
    onSuccess: async () => {
      setDrawer(null);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
  const supplierMutation = useMutation({
    mutationFn: (suppliers: SupplierLinkDraft[]) => catalogApi.updateProductSuppliers(productId, {
      suppliers: suppliers
        .filter((supplier) => supplier.supplierId)
        .map((supplier) => ({
          supplierId: Number(supplier.supplierId),
          supplierSku: supplier.supplierSku.trim() || null,
          lastPurchasePrice: supplier.lastPurchasePrice ? Number(supplier.lastPurchasePrice) : null,
        })),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product-suppliers', productId] });
    },
  });
  const product = productQuery.data?.product;
  const [supplierLinks, setSupplierLinks] = useState<SupplierLinkDraft[]>([]);

  useEffect(() => {
    const items = productSuppliersQuery.data?.items ?? [];
    setSupplierLinks(items.map((item) => ({
      supplierId: String(item.supplier_id),
      supplierSku: item.supplier_sku ?? '',
      lastPurchasePrice: item.last_purchase_price ?? '',
    })));
  }, [productSuppliersQuery.data?.items]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('catalog.module', { ns: 'app' })}</p>
          <h1>{product?.default_name ?? t('catalog.detail.fallbackName', { ns: 'app' })}</h1>
        </div>
        <Link to="/catalog/products">{t('catalog.backToList', { ns: 'app' })}</Link>
      </header>
      {productQuery.isLoading ? <section className="panel">{t('catalog.detail.loading', { ns: 'app' })}</section> : null}
      {productQuery.isError ? <section className="panel">{t('catalog.detail.error', { ns: 'app' })}</section> : null}
      {product ? (
        <section className="detail-grid">
          <article className="panel entity-summary">
            <p>
              <strong>SKU:</strong> {product.sku}
            </p>
            <p>
              <strong>{t('catalog.category', { ns: 'app' })}:</strong> {product.category_name}
            </p>
            <p>
              <strong>{t('catalog.detail.unit', { ns: 'app' })}:</strong> {product.unit_name_ru}
            </p>
            <p>
              <strong>{t('catalog.detail.tracking', { ns: 'app' })}:</strong> {t(`catalog.form.trackingTypes.${product.tracking_type}`, { ns: 'app' })}
            </p>
            <p>
              <strong>{t('catalog.detail.purchase', { ns: 'app' })}:</strong> <MoneyDisplay value={product.current_purchase_price} />
            </p>
            <p>
              <strong>{t('catalog.detail.sale', { ns: 'app' })}:</strong> <MoneyDisplay value={product.current_sale_price} />
            </p>
          </article>
          <article className="panel entity-actions">
            <PermissionGate permission="catalog.products.manage">
              <Button variant="secondary" onClick={() => setDrawer('edit')}>
                {t('catalog.detail.edit', { ns: 'app' })}
              </Button>
            </PermissionGate>
            <PermissionGate permission="catalog.prices.change">
              <Button variant="secondary" onClick={() => setDrawer('price')}>
                {t('catalog.detail.changePrice', { ns: 'app' })}
              </Button>
            </PermissionGate>
          </article>
        </section>
      ) : null}
      {product ? (
        <section className="panel" style={{ display: 'grid', gap: '1rem' }}>
          <div className="page-header" style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <div>
              <h2>{t('catalog.productSuppliersTitle', { ns: 'app' })}</h2>
              <p>{t('catalog.productSuppliersText', { ns: 'app' })}</p>
            </div>
            <PermissionGate permission="catalog.products.manage">
              <Button variant="secondary" onClick={() => setSupplierLinks((current) => [...current, { supplierId: '', supplierSku: '', lastPurchasePrice: '' }])}>
                {t('catalog.addSupplierLink', { ns: 'app' })}
              </Button>
            </PermissionGate>
          </div>

          {supplierLinks.length ? (
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {supplierLinks.map((supplier, index) => (
                <div key={`${supplier.supplierId}-${index}`} style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'end' }}>
                  <Select
                    label={t('catalog.supplierName', { ns: 'app' })}
                    value={supplier.supplierId}
                    onChange={(event) => setSupplierLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, supplierId: event.target.value } : item))}
                  >
                    <option value="">-</option>
                    {(suppliersQuery.data?.items ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label={t('catalog.sku', { ns: 'app' })}
                    value={supplier.supplierSku}
                    onChange={(event) => setSupplierLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, supplierSku: event.target.value } : item))}
                  />
                  <Input
                    label={t('catalog.detail.newPurchasePrice', { ns: 'app' })}
                    type="number"
                    step="0.01"
                    value={supplier.lastPurchasePrice}
                    onChange={(event) => setSupplierLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, lastPurchasePrice: event.target.value } : item))}
                  />
                  <Button variant="danger" onClick={() => setSupplierLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                    {t('catalog.removeSupplierLink', { ns: 'app' })}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p>{t('catalog.productSuppliersEmpty', { ns: 'app' })}</p>
          )}

          <PermissionGate permission="catalog.products.manage">
            <Button isLoading={supplierMutation.isPending} onClick={() => supplierMutation.mutate(supplierLinks)}>
              {t('catalog.saveSupplierLinks', { ns: 'app' })}
            </Button>
          </PermissionGate>
        </section>
      ) : null}
      <FormDrawer title={t('catalog.detail.editTitle', { ns: 'app' })} isOpen={drawer === 'edit'} onClose={() => setDrawer(null)}>
        {product ? (
          <ProductForm
            mode="edit"
            product={product}
            categories={categoriesQuery.data?.items ?? []}
            units={unitsQuery.data?.items ?? []}
            onSubmit={(values) => updateMutation.mutateAsync(values)}
            isSubmitting={updateMutation.isPending}
          />
        ) : null}
      </FormDrawer>
      <FormDrawer title={t('catalog.detail.priceTitle', { ns: 'app' })} isOpen={drawer === 'price'} onClose={() => setDrawer(null)}>
        <PriceForm onSubmit={(values) => priceMutation.mutateAsync(values)} isSubmitting={priceMutation.isPending} />
      </FormDrawer>
    </>
  );
}

function PriceForm({ onSubmit, isSubmitting }: { onSubmit: (values: PriceChangeValues) => Promise<unknown>; isSubmitting: boolean }) {
  const { t } = useTranslation(['app', 'common']);
  const form = useForm({ resolver: zodResolver(priceChangeSchema), defaultValues: { newPurchasePrice: 0, newSalePrice: 0, reason: '' } });

  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as PriceChangeValues))}>
      <Input
        label={t('catalog.detail.newPurchasePrice', { ns: 'app' })}
        type="number"
        step="0.01"
        error={form.formState.errors.newPurchasePrice?.message}
        {...form.register('newPurchasePrice')}
      />
      <Input
        label={t('catalog.detail.newSalePrice', { ns: 'app' })}
        type="number"
        step="0.01"
        error={form.formState.errors.newSalePrice?.message}
        {...form.register('newSalePrice')}
      />
      <Textarea label={t('catalog.detail.reason', { ns: 'app' })} {...form.register('reason')} />
      <Button type="submit" isLoading={isSubmitting}>
        {t('catalog.detail.savePrice', { ns: 'app' })}
      </Button>
    </form>
  );
}
