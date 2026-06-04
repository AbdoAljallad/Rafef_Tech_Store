import React, { useState } from 'react';
import financeApi from '../../modules/finance/api/finance.api';

export function ExpensesPage() {
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [result, setResult] = useState<any>(null);

  async function create() {
    const r = await financeApi.createExpense({ accountId: accountId ? Number(accountId) : null, amount: Number(amount), currency: 'USD', category, notes: 'UI expense' });
    setResult(r);
  }

  return (
    <div>
      <h2>Expenses</h2>
      <div>
        <input placeholder="Account ID" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <button onClick={create}>Create</button>
      </div>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default ExpensesPage;
