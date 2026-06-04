import React, { useState } from 'react';
import financeApi from '../../modules/finance/api/finance.api';

export function LedgerPage() {
  const [customerId, setCustomerId] = useState('');
  const [change, setChange] = useState('');
  const [balanceAfter, setBalanceAfter] = useState('');
  const [result, setResult] = useState<any>(null);

  async function create() {
    if (!customerId) return;
    const r = await financeApi.createLedgerEntry(Number(customerId), { change: Number(change), balanceAfter: Number(balanceAfter), notes: 'UI ledger entry' });
    setResult(r);
  }

  return (
    <div>
      <h2>Customer Ledger Entry</h2>
      <div>
        <input placeholder="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
        <input placeholder="Change" value={change} onChange={(e) => setChange(e.target.value)} />
        <input placeholder="Balance After" value={balanceAfter} onChange={(e) => setBalanceAfter(e.target.value)} />
        <button onClick={create}>Create</button>
      </div>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default LedgerPage;
