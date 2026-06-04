import React, { useState } from 'react';
import financeApi from '../../modules/finance/api/finance.api';

export function RefundsPage() {
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<any>(null);

  async function create() {
    const r = await financeApi.createRefund({ transactionId: transactionId ? Number(transactionId) : null, amount: Number(amount), currency: 'USD', reason: 'UI refund' });
    setResult(r);
  }

  return (
    <div>
      <h2>Refunds</h2>
      <div>
        <input placeholder="Transaction ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
        <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button onClick={create}>Create</button>
      </div>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default RefundsPage;
