import { useQuery } from '@tanstack/react-query';
import { History, PackagePlus, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { inventoryApi } from '../../modules/inventory/api/inventory.api';
import type { StockBalance } from '../../modules/inventory/types/inventory.types';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';

function quantity(value: string) {
  return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 4 });
}

export function InventoryStockPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const stockQuery = useQuery({ queryKey: ['inventory-stock', search], queryFn: () => inventoryApi.listStock(search) });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => catalogApi.listProducts() });
  const productsById = useMemo(
    () => new Map((productsQuery.data?.items ?? []).map((product) => [product.id, product])),
    [productsQuery.data?.items],
  );

  function stockStatus(row: StockBalance) {
    const product = productsById.get(row.product_id);
    const threshold = Number(product?.reorder_threshold ?? 0);
    const available = Number(row.quantity_available);

    if (threshold > 0 && available <= threshold) {
      return <Badge tone="warning">Низкий остаток</Badge>;
    }

    return <Badge tone="success">В норме</Badge>;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Складские остатки</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={<History size={18} />} onClick={() => navigate('/inventory/movements')}>
            Движения
          </Button>
          <Button variant="secondary" icon={<PackagePlus size={18} />} onClick={() => navigate('/inventory/purchases')}>
            Закупки
          </Button>
          <Button variant="secondary" icon={<SlidersHorizontal size={18} />} onClick={() => navigate('/inventory/adjustments')}>
            Корректировки
          </Button>
        </div>
      </header>

      <section className="page-toolbar">
        <SearchInput placeholder="Поиск по названию или SKU" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button variant="secondary" onClick={() => navigate('/inventory/reservations')}>Резервы</Button>
      </section>

      <DataTable
        rows={stockQuery.data?.items ?? []}
        isLoading={stockQuery.isLoading}
        emptyText={stockQuery.isError ? 'Не удалось загрузить складские остатки' : 'Остатки не найдены'}
        getRowKey={(row) => row.product_id}
        columns={[
          { key: 'name', header: 'Товар', render: (row) => <Link to={`/catalog/products/${row.product_id}`}>{row.default_name}</Link> },
          { key: 'sku', header: 'SKU', render: (row) => row.sku },
          { key: 'category', header: 'Категория', render: (row) => productsById.get(row.product_id)?.category_name ?? '-' },
          { key: 'onHand', header: 'На складе', render: (row) => quantity(row.quantity_on_hand) },
          { key: 'reserved', header: 'В резерве', render: (row) => quantity(row.quantity_reserved) },
          { key: 'available', header: 'Доступно', render: (row) => quantity(row.quantity_available) },
          { key: 'threshold', header: 'Мин. остаток', render: (row) => quantity(productsById.get(row.product_id)?.reorder_threshold ?? '0') },
          { key: 'status', header: 'Статус', render: stockStatus },
        ]}
      />
    </>
  );
}
