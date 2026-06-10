import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function LedgerPage() {
  const { t } = useTranslation(['app', 'common']);
  const [customerId, setCustomerId] = useState('');
  const [change, setChange] = useState('');
  const [balanceAfter, setBalanceAfter] = useState('');
  const [result, setResult] = useState<unknown>(null);

  async function create() {
    if (!customerId) {
      return;
    }

    const response = await financeApi.createLedgerEntry(Number(customerId), {
      change: Number(change),
      balanceAfter: Number(balanceAfter),
      notes: t('finance.ledgerPage.interfaceNote', { ns: 'app' }),
    });
    setResult(response);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('finance.module', { ns: 'app' })}</p>
          <h1>{t('finance.ledgerTitle', { ns: 'app' })}</h1>
        </div>
      </header>

      <section className="panel entity-form">
        <div className="inline-form">
          <Input label={t('finance.customerId', { ns: 'app' })} value={customerId} onChange={(event) => setCustomerId(event.target.value)} />
          <Input label={t('finance.ledgerPage.change', { ns: 'app' })} value={change} onChange={(event) => setChange(event.target.value)} type="number" step="0.01" />
          <Input
            label={t('finance.ledgerPage.balanceAfter', { ns: 'app' })}
            value={balanceAfter}
            onChange={(event) => setBalanceAfter(event.target.value)}
            type="number"
            step="0.01"
          />
          <Button onClick={create}>{t('finance.ledgerPage.create', { ns: 'app' })}</Button>
        </div>
      </section>

      {result ? (
        <section className="panel">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>
      ) : null}
    </>
  );
}

export default LedgerPage;
