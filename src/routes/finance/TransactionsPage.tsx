import React, { useState } from 'react';
import financeApi from '../../modules/finance/api/finance.api';

export function TransactionsPage() {
  const [accountId, setAccountId] = useState<number | ''>('');
  const [methodId, setMethodId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [result, setResult] = useState<any>(null);

  async function create() {
    const payload = { accountId: accountId || null, paymentMethodId: methodId || null, amount: Number(amount), currency: 'USD', direction };
    const r = await financeApi.createTransaction(payload);
    setResult(r);
  }

  return (
    <div>
      <h2>Transactions</h2>
      <div>
        <input placeholder="Account ID" value={accountId as any} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')} />
        <input placeholder="Method ID" value={methodId as any} onChange={(e) => setMethodId(e.target.value ? Number(e.target.value) : '')} />
        <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select value={direction} onChange={(e) => setDirection(e.target.value as any)}>
          <option value="in">In</option>
          <option value="out">Out</option>
        </select>
        <button onClick={create}>Create</button>
      </div>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default TransactionsPage;
