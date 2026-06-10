import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function BarcodeLookupPage() {
  const { t } = useTranslation(['app', 'common']);
  const [barcode, setBarcode] = useState('');
  const lookup = useMutation({ mutationFn: catalogApi.lookupBarcode });

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('catalog.module', { ns: 'app' })}</p>
          <h1>{t('catalog.barcodeLookup', { ns: 'app' })}</h1>
        </div>
        <Link to="/catalog/products">{t('catalog.backToProducts', { ns: 'app' })}</Link>
      </header>
      <section className="panel">
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (barcode.trim()) {
              void lookup.mutateAsync(barcode.trim());
            }
          }}
        >
          <Input label={t('catalog.barcodeLabel', { ns: 'app' })} value={barcode} onChange={(event) => setBarcode(event.target.value)} autoFocus />
          <Button type="submit" isLoading={lookup.isPending}>
            {t('common:actions.search')}
          </Button>
        </form>
      </section>
      {lookup.isError ? <section className="panel">{t('catalog.barcodeNotFound', { ns: 'app' })}</section> : null}
      {lookup.data?.product ? (
        <section className="panel entity-summary">
          <h2>{lookup.data.product.default_name}</h2>
          <p>
            <strong>SKU:</strong> {lookup.data.product.sku}
          </p>
          <p>
            <strong>{t('catalog.price', { ns: 'app' })}:</strong> <MoneyDisplay value={lookup.data.product.current_sale_price} />
          </p>
          <Link to={`/catalog/products/${lookup.data.product.id}`}>{t('catalog.openProduct', { ns: 'app' })}</Link>
        </section>
      ) : null}
    </>
  );
}
