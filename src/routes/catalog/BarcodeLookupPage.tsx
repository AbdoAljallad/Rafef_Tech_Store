import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function BarcodeLookupPage() {
  const [barcode, setBarcode] = useState('');
  const lookup = useMutation({ mutationFn: catalogApi.lookupBarcode });

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">Catalog</p><h1>Поиск по штрихкоду</h1></div>
        <Link to="/catalog/products">К товарам</Link>
      </header>
      <section className="panel">
        <form className="inline-form" onSubmit={(event) => { event.preventDefault(); if (barcode.trim()) void lookup.mutateAsync(barcode.trim()); }}>
          <Input label="Штрихкод" value={barcode} onChange={(event) => setBarcode(event.target.value)} autoFocus />
          <Button type="submit" isLoading={lookup.isPending}>Найти</Button>
        </form>
      </section>
      {lookup.isError ? <section className="panel">Товар не найден</section> : null}
      {lookup.data?.product ? (
        <section className="panel entity-summary">
          <h2>{lookup.data.product.default_name}</h2>
          <p><strong>SKU:</strong> {lookup.data.product.sku}</p>
          <p><strong>Цена:</strong> <MoneyDisplay value={lookup.data.product.current_sale_price} /></p>
          <Link to={`/catalog/products/${lookup.data.product.id}`}>Открыть товар</Link>
        </section>
      ) : null}
    </>
  );
}
