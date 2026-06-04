import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import creativeApi, { type CreativeJobListItem } from '../../modules/creative/api/creative.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function JobsPage() {
  const [items, setItems] = useState<CreativeJobListItem[]>([]);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const loadJobs = useCallback(async () => { setIsLoading(true); setError(null); try { setItems((await creativeApi.listJobs()).items); } catch { setError('Не удалось загрузить работы'); setItems([]); } finally { setIsLoading(false); } }, []);
  useEffect(() => { void loadJobs(); }, [loadJobs]);
  async function create() {
    if (!title.trim()) return;
    setIsCreating(true);
    try { await creativeApi.createJob({ title: title.trim(), description: '' }); setTitle(''); await loadJobs(); } finally { setIsCreating(false); }
  }
  return <>
    <header className="page-header"><div><p className="eyebrow">Дизайн и печать</p><h1>Работы</h1></div></header>
    <section className="panel entity-form">
      <h2>Новая работа</h2>
      <div className="inline-form"><Input label="Название" value={title} onChange={(e) => setTitle(e.target.value)} /><Button onClick={create} isLoading={isCreating}>Создать</Button></div>
    </section>
    {error ? <ErrorState title="Ошибка" description={error} /> : null}
    <DataTable rows={items} isLoading={isLoading} emptyText="Работы не найдены" getRowKey={(job) => job.id} onRowClick={(job) => navigate(`/creative/jobs/${job.id}`)} columns={[
      { key: 'code', header: 'Код', render: (job) => job.job_code },
      { key: 'title', header: 'Название', render: (job) => job.title },
      { key: 'status', header: 'Статус', render: (job) => job.status },
      { key: 'deadline', header: 'Срок', render: (job) => job.deadline ?? '-' },
    ]} />
  </>;
}

export default JobsPage;
