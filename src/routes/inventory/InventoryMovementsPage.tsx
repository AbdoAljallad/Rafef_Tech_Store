import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { inventoryApi } from '../../modules/inventory/api/inventory.api';
import type { StockMovement } from '../../modules/inventory/types/inventory.types';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Select } from '../../shared/ui/Select';

function movementLabel(t: (key: string) => string, type: StockMovement['movement_type']) {
  return t(`inventory.movementsPage.types.${type}`);
}

export function InventoryMovementsPage() {
  const { t, i18n } = useTranslation('app');
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
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
          <p className="eyebrow">{t('inventory.module')}</p>
          <h1>{t('inventory.movements')}</h1>
        </div>
        <Link to="/inventory/stock">{t('inventory.backToStock')}</Link>
      </header>

      <section className="page-toolbar">
        <SearchInput placeholder={t('inventory.movementsPage.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select label={t('inventory.product')} value={productId} onChange={(event) => setProductId(event.target.value)}>
          <option value="">{t('inventory.selectProduct')}</option>
          {(productsQuery.data?.items ?? []).map((product) => (
            <option key={product.id} value={product.id}>
              {product.sku} - {product.default_name}
            </option>
          ))}
        </Select>
      </section>

      {!productId ? <section className="panel">{t('inventory.movementsPage.chooseProduct')}</section> : null}

      {productId ? (
        <DataTable
          rows={movementsQuery.data?.items ?? []}
          isLoading={movementsQuery.isLoading}
          emptyText={movementsQuery.isError ? t('inventory.movementsPage.loadFailed') : t('inventory.movementsPage.empty')}
          getRowKey={(movement) => movement.id}
          columns={[
            { key: 'type', header: t('inventory.movementsPage.columns.type'), render: (movement) => <Badge tone="info">{movementLabel(t, movement.movement_type)}</Badge> },
            {
              key: 'quantity',
              header: t('inventory.quantity'),
              render: (movement) => {
                const sign = movement.movement_type === 'adjustment_out' || movement.movement_type === 'reservation_consume' ? '-' : '+';
                return `${sign}${Number(movement.quantity).toLocaleString(locale, { maximumFractionDigits: 4 })}`;
              },
            },
            {
              key: 'cost',
              header: t('inventory.unitCost'),
              render: (movement) => (movement.unit_cost ? <MoneyDisplay value={movement.unit_cost} /> : '-'),
            },
            { key: 'source', header: t('inventory.movementsPage.columns.source'), render: (movement) => `${movement.source_type} #${movement.source_id}` },
            { key: 'user', header: t('inventory.movementsPage.columns.user'), render: (movement) => movement.created_by_user_id ?? '-' },
            { key: 'date', header: t('inventory.movementsPage.columns.date'), render: (movement) => new Date(movement.created_at).toLocaleString(locale) },
            { key: 'note', header: t('inventory.notes'), render: (movement) => movement.note || '-' },
          ]}
        />
      ) : null}
    </>
  );
}
