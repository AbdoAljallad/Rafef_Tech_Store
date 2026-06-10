import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

type PaymentMethod = {
  id: number;
  code: string;
  name: string;
  provider?: string | null;
};

export function MethodsPage() {
  const { t } = useTranslation(['app', 'common']);
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    financeApi.listMethods().then((response) => setItems((response.items ?? []) as PaymentMethod[]));
  }, []);

  async function create() {
    if (!code.trim() || !name.trim()) {
      return;
    }

    await financeApi.createMethod({ code, name });
    setItems(((await financeApi.listMethods()).items ?? []) as PaymentMethod[]);
    setCode('');
    setName('');
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('finance.module', { ns: 'app' })}</p>
          <h1>{t('finance.methodsTitle', { ns: 'app' })}</h1>
        </div>
      </header>

      <section className="panel entity-form">
        <h2>{t('finance.newMethod', { ns: 'app' })}</h2>
        <div className="inline-form">
          <Input label={t('finance.code', { ns: 'app' })} value={code} onChange={(event) => setCode(event.target.value)} />
          <Input label={t('finance.name', { ns: 'app' })} value={name} onChange={(event) => setName(event.target.value)} />
          <Button onClick={create}>{t('common:actions.save')}</Button>
        </div>
      </section>

      <DataTable
        rows={items}
        emptyText={t('finance.noMethods', { ns: 'app' })}
        getRowKey={(method) => method.id}
        columns={[
          { key: 'code', header: t('finance.code', { ns: 'app' }), render: (method) => method.code },
          { key: 'name', header: t('finance.name', { ns: 'app' }), render: (method) => method.name },
          { key: 'provider', header: t('finance.provider', { ns: 'app' }), render: (method) => method.provider ?? '-' },
        ]}
      />
    </>
  );
}
