import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { ProductForm } from '../../modules/catalog/components/ProductForm';
import type { ProductEditValues, ProductFormValues } from '../../modules/catalog/validators/catalog.schemas';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products', search], queryFn: () => catalogApi.listProducts(search) });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories });
  const unitsQuery = useQuery({ queryKey: ['units'], queryFn: catalogApi.listUnits });
  const createMutation = useMutation({
    mutationFn: catalogApi.createProduct,
    onSuccess: async () => { setIsCreateOpen(false); await queryClient.invalidateQueries({ queryKey: ['products'] }); },
  });

  async function handleCreate(values: ProductFormValues | ProductEditValues) {
    await createMutation.mutateAsync(values as ProductFormValues);
  }

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">Catalog</p><h1>Товары</h1></div>
        <PermissionGate permission="catalog.products.manage"><Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>Новый товар</Button></PermissionGate>
      </header>
      <section className="page-toolbar">
        <SearchInput placeholder="Поиск по SKU или названию" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button variant="secondary" onClick={() => navigate('/catalog/barcode')}>Поиск по штрихкоду</Button>
        <Button variant="secondary" onClick={() => navigate('/catalog/categories')}>Категории</Button>
        <Button variant="secondary" onClick={() => navigate('/catalog/services')}>Услуги</Button>
      </section>
      <DataTable
        rows={productsQuery.data?.items ?? []}
        isLoading={productsQuery.isLoading}
        emptyText={productsQuery.isError ? 'Не удалось загрузить товары' : 'Товары не найдены'}
        getRowKey={(product) => product.id}
        onRowClick={(product) => navigate(`/catalog/products/${product.id}`)}
        columns={[
          { key: 'sku', header: 'SKU', render: (product) => product.sku },
          { key: 'name', header: 'Название', render: (product) => product.default_name },
          { key: 'category', header: 'Категория', render: (product) => product.category_name },
          { key: 'price', header: 'Цена', render: (product) => <MoneyDisplay value={product.current_sale_price} /> },
        ]}
      />
      <FormDrawer title="Новый товар" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <ProductForm mode="create" categories={categoriesQuery.data?.items ?? []} units={unitsQuery.data?.items ?? []} onSubmit={handleCreate} isSubmitting={createMutation.isPending} />
      </FormDrawer>
    </>
  );
}
