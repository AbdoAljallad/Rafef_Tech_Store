import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { ProductForm } from '../../modules/catalog/components/ProductForm';
import type { Product } from '../../modules/catalog/types/catalog.types';
import { getAvailableQuantity } from '../../modules/catalog/utils/stockAvailability';
import type { ProductEditValues, ProductFormValues } from '../../modules/catalog/validators/catalog.schemas';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { formatListingResults } from '../../shared/utils/listingText';

export function ProductsPage() {
  const { t } = useTranslation('app');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products', search], queryFn: () => catalogApi.listProducts(search) });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories });
  const unitsQuery = useQuery({ queryKey: ['units'], queryFn: catalogApi.listUnits });
  const createMutation = useMutation({
    mutationFn: catalogApi.createProduct,
    onSuccess: async () => {
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const products = productsQuery.data?.items ?? [];
  const columns = useMemo<DataTableColumn<Product>[]>(() => ([
    { key: 'sku', header: t('catalog.sku'), render: (product) => product.sku },
    { key: 'name', header: t('catalog.name'), render: (product) => product.default_name },
    { key: 'category', header: t('catalog.category'), render: (product) => product.category_name },
    { key: 'price', header: t('catalog.price'), render: (product) => <MoneyDisplay value={product.current_sale_price} /> },
    { key: 'available', header: t('inventory.available'), render: (product) => getAvailableQuantity(product) },
  ]), [t]);

  async function handleCreate(values: ProductFormValues | ProductEditValues) {
    await createMutation.mutateAsync(values as ProductFormValues);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('catalog.module')}</p>
          <h1>{t('catalog.productsTitle')}</h1>
        </div>
        <div className="page-actions">
          <span className="count-pill">{formatListingResults(t, { from: products.length ? 1 : 0, to: products.length })}</span>
          <PermissionGate permission="catalog.products.manage">
            <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>{t('catalog.newProduct')}</Button>
          </PermissionGate>
        </div>
      </header>
      <section className="page-toolbar">
        <SearchInput placeholder={t('catalog.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button variant="secondary" onClick={() => navigate('/catalog/barcode')}>{t('catalog.barcodeLookup')}</Button>
        <Button variant="secondary" onClick={() => navigate('/catalog/categories')}>{t('catalog.categories')}</Button>
        <Button variant="secondary" onClick={() => navigate('/catalog/services')}>{t('catalog.services')}</Button>
      </section>
      <DataTable
        rows={products}
        isLoading={productsQuery.isLoading}
        loadingText={t('home.loading')}
        emptyText={productsQuery.isError ? t('catalog.loadFailed') : t('catalog.emptyProducts')}
        getRowKey={(product) => product.id}
        onRowClick={(product) => navigate(`/catalog/products/${product.id}`)}
        columns={columns}
      />
      <FormDrawer title={t('catalog.newProduct')} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <ProductForm mode="create" categories={categoriesQuery.data?.items ?? []} units={unitsQuery.data?.items ?? []} onSubmit={handleCreate} isSubmitting={createMutation.isPending} />
      </FormDrawer>
    </>
  );
}
