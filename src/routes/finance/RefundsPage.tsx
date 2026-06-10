import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';

export function RefundsPage() {
  const { t } = useTranslation('app');
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<any>(null);

  async function create() {
    const response = await financeApi.createRefund({
      transactionId: transactionId ? Number(transactionId) : null,
      amount: Number(amount),
      currency: 'USD',
      reason: 'UI refund',
    });
    setResult(response);
  }

  return (
    <div>
      <h2>{t('finance.refundsTitle')}</h2>
      <div>
        <input aria-label={t('finance.transactionId')} placeholder={t('finance.transactionId')} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
        <input aria-label={t('finance.amount')} placeholder={t('finance.amount')} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button onClick={create}>{t('finance.create')}</button>
      </div>
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}

export default RefundsPage;
