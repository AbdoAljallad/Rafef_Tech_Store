import React, { useState } from 'react';
import financeApi from '../../modules/finance/api/finance.api';

export function DailyClosingPage() {
  const [closedAt, setClosedAt] = useState(new Date().toISOString().slice(0,10));
  const [cashIn, setCashIn] = useState('');
  const [cashOut, setCashOut] = useState('');
  const [result, setResult] = useState<any>(null);

  async function create() {
    const totals = { cashIn: Number(cashIn), cashOut: Number(cashOut) };
    const r = await financeApi.createDailyClosing({ closedAt, totals });
    setResult(r);
  }

  return (
    <div>
      <h2>Daily Closing</h2>
      <div>
        <input type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} />
        <input placeholder="Cash In" value={cashIn} onChange={(e) => setCashIn(e.target.value)} />
        <input placeholder="Cash Out" value={cashOut} onChange={(e) => setCashOut(e.target.value)} />
        <button onClick={create}>Create</button>
      </div>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default DailyClosingPage;
