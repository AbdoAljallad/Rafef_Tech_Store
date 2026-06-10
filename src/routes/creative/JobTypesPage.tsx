import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import creativeApi from '../../modules/creative/api/creative.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function JobTypesPage() {
  const { t } = useTranslation('app');
  const [items, setItems] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    creativeApi.listJobTypes().then((response) => setItems(response.items ?? response));
  }, []);

  async function create() {
    await creativeApi.createJobType({ code, defaultName: name });
    const response = await creativeApi.listJobTypes();
    setItems(response.items ?? response);
    setCode('');
    setName('');
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('creative.module')}</p>
          <h1>{t('creative.jobTypesTitle')}</h1>
        </div>
      </header>

      <section className="panel entity-form">
        <h2>{t('creative.jobTypesTitle')}</h2>
        <div className="inline-form">
          <Input label={t('creative.codeLabel')} value={code} onChange={(event) => setCode(event.target.value)} />
          <Input label={t('creative.defaultNameLabel')} value={name} onChange={(event) => setName(event.target.value)} />
          <Button onClick={() => void create()}>{t('creative.create')}</Button>
        </div>
      </section>

      <DataTable
        rows={items}
        isLoading={false}
        emptyText={t('creative.noJobTypes')}
        getRowKey={(type) => type.id}
        columns={[
          { key: 'code', header: t('creative.codeLabel'), render: (type) => type.code },
          { key: 'name', header: t('creative.defaultNameLabel'), render: (type) => type.default_name || type.defaultName },
        ]}
      />
    </>
  );
}

export default JobTypesPage;
