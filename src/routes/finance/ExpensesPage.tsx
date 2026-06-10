import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';

export function ExpensesPage() {
  const { t } = useTranslation('app');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [result, setResult] = useState<any>(null);

  async function create() {
    const response = await financeApi.createExpense({
      accountId: accountId ? Number(accountId) : null,
      amount: Number(amount),
      currency: 'USD',
      category,
      notes: 'UI expense',
    });
    setResult(response);
  }

  return (
    <div>
      <h2>{t('finance.expensesTitle')}</h2>
      <div>
        <input aria-label={t('finance.accountId')} placeholder={t('finance.accountId')} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        <input aria-label={t('finance.amount')} placeholder={t('finance.amount')} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input aria-label={t('finance.category')} placeholder={t('finance.category')} value={category} onChange={(e) => setCategory(e.target.value)} />
        <button onClick={create}>{t('finance.create')}</button>
      </div>
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}

export default ExpensesPage;
