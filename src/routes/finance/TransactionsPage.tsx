import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';

export function TransactionsPage() {
  const { t } = useTranslation('app');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [methodId, setMethodId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [result, setResult] = useState<any>(null);

  async function create() {
    const payload = { accountId: accountId || null, paymentMethodId: methodId || null, amount: Number(amount), currency: 'USD', direction };
    const response = await financeApi.createTransaction(payload);
    setResult(response);
  }

  return (
    <div>
      <h2>{t('finance.transactionsTitle')}</h2>
      <div>
        <input
          aria-label={t('finance.accountId')}
          placeholder={t('finance.accountId')}
          value={accountId as any}
          onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}
        />
        <input
          aria-label={t('finance.methodId')}
          placeholder={t('finance.methodId')}
          value={methodId as any}
          onChange={(e) => setMethodId(e.target.value ? Number(e.target.value) : '')}
        />
        <input aria-label={t('finance.amount')} placeholder={t('finance.amount')} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select aria-label={t('finance.direction')} value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')}>
          <option value="in">{t('finance.directionIn')}</option>
          <option value="out">{t('finance.directionOut')}</option>
        </select>
        <button onClick={create}>{t('finance.create')}</button>
      </div>
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}

export default TransactionsPage;
