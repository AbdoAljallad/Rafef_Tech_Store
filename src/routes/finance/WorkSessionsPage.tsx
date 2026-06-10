import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../modules/finance/api/finance.api';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function WorkSessionsPage() {
  const { t } = useTranslation(['app', 'common']);
  const [startingBalance, setStartingBalance] = useState('');
  const [endingBalance, setEndingBalance] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [result, setResult] = useState<unknown>(null);

  async function start() {
    const response = await financeApi.startWorkSession({ startingBalance: Number(startingBalance), notes: t('finance.workSessionsPage.startNote', { ns: 'app' }) });
    setSessionId(response.session?.id ?? null);
    setResult(response);
  }

  async function close() {
    if (!sessionId) {
      return;
    }

    const response = await financeApi.closeWorkSession(sessionId, { endingBalance: Number(endingBalance), notes: t('finance.workSessionsPage.closeNote', { ns: 'app' }) });
    setResult(response);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('finance.module', { ns: 'app' })}</p>
          <h1>{t('finance.workSessionsTitle', { ns: 'app' })}</h1>
        </div>
      </header>

      <section className="detail-grid">
        <article className="panel entity-form">
          <h2>{t('finance.workSessionsPage.startTitle', { ns: 'app' })}</h2>
          <Input
            label={t('finance.workSessionsPage.startingBalance', { ns: 'app' })}
            value={startingBalance}
            onChange={(event) => setStartingBalance(event.target.value)}
            type="number"
            step="0.01"
          />
          <Button onClick={start}>{t('finance.workSessionsPage.startAction', { ns: 'app' })}</Button>
        </article>

        <article className="panel entity-form">
          <h2>{t('finance.workSessionsPage.closeTitle', { ns: 'app' })}</h2>
          <Input label={t('finance.workSessionsPage.sessionId', { ns: 'app' })} value={sessionId ?? ''} readOnly />
          <Input
            label={t('finance.workSessionsPage.endingBalance', { ns: 'app' })}
            value={endingBalance}
            onChange={(event) => setEndingBalance(event.target.value)}
            type="number"
            step="0.01"
          />
          <Button onClick={close}>{t('finance.workSessionsPage.closeAction', { ns: 'app' })}</Button>
        </article>
      </section>

      {result ? (
        <section className="panel">
          <h2>{t('finance.workSessionsPage.resultTitle', { ns: 'app' })}</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>
      ) : null}
    </>
  );
}

export default WorkSessionsPage;
