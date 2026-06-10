import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import creativeApi from '../../modules/creative/api/creative.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function VendorsPage() {
  const { t } = useTranslation('app');
  const [items, setItems] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    creativeApi.listVendors().then((response) => setItems(response.items ?? response));
  }, []);

  async function create() {
    await creativeApi.createVendor({ code, name });
    const response = await creativeApi.listVendors();
    setItems(response.items ?? response);
    setCode('');
    setName('');
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('creative.module')}</p>
          <h1>{t('creative.vendorsTitle')}</h1>
        </div>
      </header>

      <section className="panel entity-form">
        <h2>{t('creative.vendorsTitle')}</h2>
        <div className="inline-form">
          <Input label={t('creative.codeLabel')} value={code} onChange={(event) => setCode(event.target.value)} />
          <Input label={t('creative.titleLabel')} value={name} onChange={(event) => setName(event.target.value)} />
          <Button onClick={() => void create()}>{t('creative.create')}</Button>
        </div>
      </section>

      <DataTable
        rows={items}
        isLoading={false}
        emptyText={t('creative.noVendors')}
        getRowKey={(vendor) => vendor.id}
        columns={[
          { key: 'code', header: t('creative.codeLabel'), render: (vendor) => vendor.code },
          { key: 'name', header: t('creative.titleLabel'), render: (vendor) => vendor.name },
        ]}
      />
    </>
  );
}

export default VendorsPage;
