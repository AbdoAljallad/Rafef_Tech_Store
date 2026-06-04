import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { inventoryApi } from '../../modules/inventory/api/inventory.api';
import type { StockMovement } from '../../modules/inventory/types/inventory.types';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Select } from '../../shared/ui/Select';

const movementLabels: Record<StockMovement['movement_type'], string> = {
  purchase_in: 'Приход закупки',
  adjustment_in: 'Корректировка +',
  adjustment_out: 'Корректировка -',
  reservation_consume: 'Списание резерва',
};

function signedQuantity(movement: StockMovement) {
  const sign = movement.movement_type === 'adjustment_out' || movement.movement_type === 'reservation_consume' ? '-' : '+';
  return `${sign}${Number(movement.quantity).toLocaleString('ru-RU', { maximumFractionDigits: 4 })}`;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU');
}

export function InventoryMovementsPage() {
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const productsQuery = useQuery({ queryKey: ['products', search], queryFn: () => catalogApi.listProducts(search) });
  const movementsQuery = useQuery({
    queryKey: ['inventory-movements', productId],
    queryFn: () => inventoryApi.listMovements(productId),
    enabled: Boolean(productId),
  });

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>История движений товара</h1>
        </div>
        <Link to="/inventory/stock">К остаткам</Link>
      </header>

      <section className="page-toolbar">
        <SearchInput placeholder="Поиск товара для выбора" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select label="Товар" value={productId} onChange={(event) => setProductId(event.target.value)}>
          <option value="">Выберите товар</option>
          {(productsQuery.data?.items ?? []).map((product) => (
            <option key={product.id} value={product.id}>
              {product.sku} - {product.default_name}
            </option>
          ))}
        </Select>
      </section>

      {!productId ? <section className="panel">Выберите товар, чтобы посмотреть движения.</section> : null}

      {productId ? (
        <DataTable
          rows={movementsQuery.data?.items ?? []}
          isLoading={movementsQuery.isLoading}
          emptyText={movementsQuery.isError ? 'Не удалось загрузить движения' : 'Движений по товару пока нет'}
          getRowKey={(movement) => movement.id}
          columns={[
            { key: 'type', header: 'Тип', render: (movement) => <Badge tone="info">{movementLabels[movement.movement_type]}</Badge> },
            { key: 'quantity', header: 'Количество', render: signedQuantity },
            { key: 'cost', header: 'Себестоимость', render: (movement) => (movement.unit_cost ? <MoneyDisplay value={movement.unit_cost} /> : '-') },
            { key: 'source', header: 'Источник', render: (movement) => `${movement.source_type} #${movement.source_id}` },
            { key: 'user', header: 'Пользователь', render: (movement) => movement.created_by_user_id ?? '-' },
            { key: 'date', header: 'Дата', render: (movement) => dateTime(movement.created_at) },
            { key: 'note', header: 'Примечание', render: (movement) => movement.note || '-' },
          ]}
        />
      ) : null}
    </>
  );
}
