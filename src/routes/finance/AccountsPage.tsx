import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function AccountsPage() {
  const { t } = useTranslation('app');
  const [items, setItems] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    financeApi.listAccounts().then((r) => setItems(r.items ?? []));
  }, []);

  async function create() {
    if (!code.trim() || !name.trim()) return;
    await financeApi.createAccount({ code, name });
    setItems((await financeApi.listAccounts()).items ?? []);
    setCode('');
    setName('');
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('finance.module')}</p>
          <h1>{t('finance.accountsTitle')}</h1>
        </div>
      </header>
      <section className="panel entity-form">
        <h2>{t('finance.newAccount')}</h2>
        <div className="inline-form">
          <Input label={t('finance.code')} value={code} onChange={(e) => setCode(e.target.value)} />
          <Input label={t('finance.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={create}>{t('finance.create')}</Button>
        </div>
      </section>
      <DataTable
        rows={items}
        emptyText={t('finance.noAccounts')}
        getRowKey={(account) => account.id}
        columns={[
          { key: 'code', header: t('finance.code'), render: (account) => account.code },
          { key: 'name', header: t('finance.name'), render: (account) => account.name },
          { key: 'type', header: t('finance.type'), render: (account) => account.type ?? '-' },
        ]}
      />
    </>
  );
}
