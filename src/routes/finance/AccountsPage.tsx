import { useEffect, useState } from 'react';
import financeApi from '../../modules/finance/api/finance.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function AccountsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  useEffect(() => { financeApi.listAccounts().then((r) => setItems(r.items ?? [])); }, []);
  async function create() {
    if (!code.trim() || !name.trim()) return;
    await financeApi.createAccount({ code, name });
    setItems((await financeApi.listAccounts()).items ?? []);
    setCode(''); setName('');
  }
  return <>
    <header className="page-header"><div><p className="eyebrow">Финансы</p><h1>Платежные счета</h1></div></header>
    <section className="panel entity-form">
      <h2>Новый счет</h2>
      <div className="inline-form"><Input label="Код" value={code} onChange={(e) => setCode(e.target.value)} /><Input label="Название" value={name} onChange={(e) => setName(e.target.value)} /><Button onClick={create}>Создать</Button></div>
    </section>
    <DataTable rows={items} emptyText="Счета не найдены" getRowKey={(a) => a.id} columns={[
      { key: 'code', header: 'Код', render: (a) => a.code },
      { key: 'name', header: 'Название', render: (a) => a.name },
      { key: 'type', header: 'Тип', render: (a) => a.type ?? '-' },
    ]} />
  </>;
}
