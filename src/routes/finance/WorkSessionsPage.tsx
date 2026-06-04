import React, { useState } from 'react';
import financeApi from '../../modules/finance/api/finance.api';

export function WorkSessionsPage() {
  const [startingBalance, setStartingBalance] = useState('');
  const [endingBalance, setEndingBalance] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);

  async function start() {
    const r = await financeApi.startWorkSession({ startingBalance: Number(startingBalance), notes: 'UI start' });
    setSessionId(r.session?.id ?? null);
    setResult(r);
  }

  async function close() {
    if (!sessionId) return;
    const r = await financeApi.closeWorkSession(sessionId, { endingBalance: Number(endingBalance), notes: 'UI close' });
    setResult(r);
  }

  return (
    <div>
      <h2>Work Sessions</h2>
      <div>
        <input placeholder="Starting Balance" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} />
        <button onClick={start}>Start</button>
      </div>
      <div>
        <input placeholder="Session ID" value={sessionId ?? ''} readOnly />
        <input placeholder="Ending Balance" value={endingBalance} onChange={(e) => setEndingBalance(e.target.value)} />
        <button onClick={close}>Close</button>
      </div>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default WorkSessionsPage;
