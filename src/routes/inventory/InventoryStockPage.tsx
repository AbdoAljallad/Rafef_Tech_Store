import { useQuery } from '@tanstack/react-query';
import { History, PackagePlus, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { inventoryApi } from '../../modules/inventory/api/inventory.api';
import type { StockBalance } from '../../modules/inventory/types/inventory.types';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable/DataTable';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { formatListingResults } from '../../shared/utils/listingText';

function formatQuantity(value: string, locale: string) {
  return Number(value).toLocaleString(locale, { maximumFractionDigits: 4 });
}

export function InventoryStockPage() {
  const { t, i18n } = useTranslation('app');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const stockQuery = useQuery({ queryKey: ['inventory-stock', search], queryFn: () => inventoryApi.listStock(search) });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => catalogApi.listProducts() });
  const productsById = useMemo(
    () => new Map((productsQuery.data?.items ?? []).map((product) => [product.id, product])),
    [productsQuery.data?.items],
  );
  const rows = stockQuery.data?.items ?? [];
  const locale = i18n.resolvedLanguage || 'ru';

  function stockStatus(row: StockBalance) {
    const product = productsById.get(row.product_id);
    const threshold = Number(product?.reorder_threshold ?? 0);
    const available = Number(row.quantity_available);

    if (threshold > 0 && available <= threshold) {
      return <Badge tone="warning">{t('inventory.statusLow')}</Badge>;
    }

    return <Badge tone="success">{t('inventory.statusOk')}</Badge>;
  }

  const columns = useMemo<DataTableColumn<StockBalance>[]>(() => ([
    { key: 'name', header: t('inventory.product'), render: (row) => <Link to={`/catalog/products/${row.product_id}`}>{row.default_name}</Link> },
    { key: 'sku', header: t('catalog.sku'), render: (row) => row.sku },
    { key: 'category', header: t('inventory.category'), render: (row) => productsById.get(row.product_id)?.category_name ?? '-' },
    { key: 'onHand', header: t('inventory.onHand'), render: (row) => formatQuantity(row.quantity_on_hand, locale) },
    { key: 'reserved', header: t('inventory.reserved'), render: (row) => formatQuantity(row.quantity_reserved, locale) },
    { key: 'available', header: t('inventory.available'), render: (row) => formatQuantity(row.quantity_available, locale) },
    { key: 'threshold', header: t('inventory.threshold'), render: (row) => formatQuantity(productsById.get(row.product_id)?.reorder_threshold ?? '0', locale) },
    { key: 'status', header: t('inventory.status'), render: stockStatus },
  ]), [locale, productsById, t]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('inventory.module')}</p>
          <h1>{t('inventory.stockTitle')}</h1>
        </div>
        <div className="page-actions">
          <span className="count-pill">{formatListingResults(t, { from: rows.length ? 1 : 0, to: rows.length })}</span>
          <Button variant="secondary" icon={<History size={18} />} onClick={() => navigate('/inventory/movements')}>
            {t('inventory.movements')}
          </Button>
          <Button variant="secondary" icon={<PackagePlus size={18} />} onClick={() => navigate('/inventory/purchases')}>
            {t('inventory.purchases')}
          </Button>
          <Button variant="secondary" icon={<SlidersHorizontal size={18} />} onClick={() => navigate('/inventory/adjustments')}>
            {t('inventory.adjustments')}
          </Button>
        </div>
      </header>

      <section className="page-toolbar">
        <SearchInput placeholder={t('inventory.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button variant="secondary" onClick={() => navigate('/inventory/reservations')}>{t('inventory.reservations')}</Button>
      </section>

      <DataTable
        rows={rows}
        isLoading={stockQuery.isLoading}
        loadingText={t('home.loading')}
        emptyText={stockQuery.isError ? t('inventory.loadFailed') : t('inventory.emptyStock')}
        getRowKey={(row) => row.product_id}
        columns={columns}
      />
    </>
  );
}
