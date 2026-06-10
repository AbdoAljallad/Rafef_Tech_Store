import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';

export function DailyClosingPage() {
  const { t } = useTranslation('app');
  const [closedAt, setClosedAt] = useState(new Date().toISOString().slice(0, 10));
  const [cashIn, setCashIn] = useState('');
  const [cashOut, setCashOut] = useState('');
  const [result, setResult] = useState<any>(null);

  async function create() {
    const totals = { cashIn: Number(cashIn), cashOut: Number(cashOut) };
    const response = await financeApi.createDailyClosing({ closedAt, totals });
    setResult(response);
  }

  return (
    <div>
      <h2>{t('finance.dailyClosingTitle')}</h2>
      <div>
        <input aria-label={t('finance.date')} type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} />
        <input aria-label={t('finance.cashIn')} placeholder={t('finance.cashIn')} value={cashIn} onChange={(e) => setCashIn(e.target.value)} />
        <input aria-label={t('finance.cashOut')} placeholder={t('finance.cashOut')} value={cashOut} onChange={(e) => setCashOut(e.target.value)} />
        <button onClick={create}>{t('finance.create')}</button>
      </div>
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}

export default DailyClosingPage;
