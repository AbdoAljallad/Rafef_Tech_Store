import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import creativeApi, { type CreativeJobListItem } from '../../modules/creative/api/creative.api';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

function formatCreativeStatus(status: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`creative.statuses.${status}`, { ns: 'app', defaultValue: status });
}

export function JobsPage() {
  const { t } = useTranslation(['app', 'common']);
  const [items, setItems] = useState<CreativeJobListItem[]>([]);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setItems((await creativeApi.listJobs()).items);
    } catch {
      setError(t('creative.loadJobsFailed', { ns: 'app' }));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  async function create() {
    if (!title.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      await creativeApi.createJob({ title: title.trim(), description: '' });
      setTitle('');
      await loadJobs();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('creative.module', { ns: 'app' })}</p>
          <h1>{t('creative.jobsTitle', { ns: 'app' })}</h1>
        </div>
      </header>

      <section className="panel entity-form">
        <h2>{t('creative.newJob', { ns: 'app' })}</h2>
        <div className="inline-form">
          <Input label={t('creative.titleLabel', { ns: 'app' })} value={title} onChange={(event) => setTitle(event.target.value)} />
          <Button onClick={create} isLoading={isCreating}>
            {t('creative.create', { ns: 'app' })}
          </Button>
        </div>
      </section>

      {error ? <ErrorState title={t('errors.routeErrorTitle', { ns: 'common' })} description={error} /> : null}

      <DataTable
        rows={items}
        isLoading={isLoading}
        emptyText={t('creative.noJobs', { ns: 'app' })}
        getRowKey={(job) => job.id}
        onRowClick={(job) => navigate(`/creative/jobs/${job.id}`)}
        columns={[
          { key: 'code', header: t('creative.codeLabel', { ns: 'app' }), render: (job) => job.job_code },
          { key: 'title', header: t('creative.titleLabel', { ns: 'app' }), render: (job) => job.title },
          { key: 'status', header: t('creative.status', { ns: 'app' }), render: (job) => formatCreativeStatus(job.status, t) },
          { key: 'deadline', header: t('creative.deadline', { ns: 'app' }), render: (job) => job.deadline ?? t('empty', { ns: 'common' }) },
        ]}
      />
    </>
  );
}

export default JobsPage;
