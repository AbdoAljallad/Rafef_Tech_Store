import React, { useState } from 'react';
import financeApi from '../../modules/finance/api/finance.api';

export function LedgerPage() {
  const [customerId, setCustomerId] = useState('');
  const [change, setChange] = useState('');
  const [balanceAfter, setBalanceAfter] = useState('');
  const [result, setResult] = useState<any>(null);

  async function create() {
    if (!customerId) return;
    const response = await financeApi.createLedgerEntry(Number(customerId), {
      change: Number(change),
      balanceAfter: Number(balanceAfter),
      notes: 'Запись из интерфейса',
    });
    setResult(response);
  }

  return (
    <div>
      <h2>Запись в клиентской книге</h2>
      <div>
        <input placeholder="ID клиента" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
        <input placeholder="Изменение" value={change} onChange={(e) => setChange(e.target.value)} />
        <input placeholder="Баланс после операции" value={balanceAfter} onChange={(e) => setBalanceAfter(e.target.value)} />
        <button onClick={create}>Создать</button>
      </div>
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}

export default LedgerPage;
