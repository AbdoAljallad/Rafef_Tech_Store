import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Clock3, History, ReceiptText, Store } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import creativeApi from '../../modules/creative/api/creative.api';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

const creativeStatuses = ['draft', 'pending', 'in_progress', 'completed', 'cancelled'] as const;

function resolveLocale(language?: string) {
  return language?.startsWith('ar') ? 'ar' : 'ru';
}

function formatCreativeStatus(status: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`creative.statuses.${status}`, { ns: 'app', defaultValue: status });
}

function creativeStatusTone(status: string) {
  if (status === 'completed') {
    return 'success' as const;
  }

  if (status === 'cancelled') {
    return 'danger' as const;
  }

  if (status === 'in_progress') {
    return 'info' as const;
  }

  if (status === 'pending') {
    return 'warning' as const;
  }

  return 'neutral' as const;
}

function formatDate(value: string | null, locale: string, withTime = false) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value));
}

function formatNumber(value: number | null, locale: string) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

export function JobDetailPage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const locale = resolveLocale(i18n.resolvedLanguage);
  const queryClient = useQueryClient();
  const jobId = Number(id);
  const [lineDesc, setLineDesc] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [vendorId, setVendorId] = useState('');
  const [externalTaskCode, setExternalTaskCode] = useState('');
  const [vendorTaskNotes, setVendorTaskNotes] = useState('');
  const [statusTo, setStatusTo] = useState('in_progress');
  const [statusNotes, setStatusNotes] = useState('');

  const jobQuery = useQuery({ queryKey: ['creativeJob', jobId], queryFn: () => creativeApi.getJob(jobId), enabled: Number.isFinite(jobId) });
  const vendorsQuery = useQuery({ queryKey: ['creativeVendors'], queryFn: creativeApi.listVendors });
  const job = jobQuery.data?.job;
  const vendors = vendorsQuery.data?.items ?? [];
  const quotedTotal = job?.lines.reduce((sum, line) => sum + Number(line.line_total ?? 0), 0) ?? 0;

  async function refreshJob() {
    await queryClient.invalidateQueries({ queryKey: ['creativeJob', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['creativeJobs'] });
  }

  const addLineMutation = useMutation({
    mutationFn: (payload: { description?: string | null; quantity?: number; unitPrice?: number | null }) => creativeApi.addJobLine(jobId, payload),
    onSuccess: async () => {
      setLineDesc('');
      setQuantity(1);
      setUnitPrice(0);
      await refreshJob();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: { vendorId: number; jobId: number; externalTaskCode?: string | null; notes?: string | null }) => creativeApi.createVendorTask(jobId, payload),
    onSuccess: async () => {
      setVendorId('');
      setExternalTaskCode('');
      setVendorTaskNotes('');
      await refreshJob();
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: (payload: { toStatus: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled'; notes?: string | null }) =>
      creativeApi.changeJobStatus(jobId, payload),
    onSuccess: async () => {
      setStatusNotes('');
      await refreshJob();
    },
  });

  if (!id) {
    return null;
  }

  if (jobQuery.isLoading) {
    return <section className="panel">{t('creative.detail.loading', { ns: 'app' })}</section>;
  }

  if (jobQuery.isError || !job) {
    return <ErrorState title={t('errors.routeErrorTitle', { ns: 'common' })} description={t('creative.loadJobsFailed', { ns: 'app' })} />;
  }

  async function addLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!lineDesc.trim()) {
      return;
    }

    await addLineMutation.mutateAsync({ description: lineDesc.trim(), quantity, unitPrice });
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!vendorId) {
      return;
    }

    await createTaskMutation.mutateAsync({
      vendorId: Number(vendorId),
      jobId,
      externalTaskCode: externalTaskCode.trim() || null,
      notes: vendorTaskNotes.trim() || t('creative.detail.interfaceCreatedNote', { ns: 'app' }),
    });
  }

  async function changeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await changeStatusMutation.mutateAsync({
      toStatus: statusTo as 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled',
      notes: statusNotes.trim() || t('creative.detail.interfaceChangedNote', { ns: 'app' }),
    });
  }

  return (
    <div className="ops-dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('creative.module', { ns: 'app' })}</p>
          <h1>{t('creative.detail.title', { ns: 'app', code: job.job_code })}</h1>
        </div>
        <div className="page-actions">
          <Button
            variant="secondary"
            icon={<ReceiptText size={18} />}
            disabled={!job.lines.length}
            onClick={() =>
              navigate('/sales/pos', {
                state: {
                  posDraft: {
                    context: {
                      kind: 'creative_job',
                      id: jobId,
                      code: job.job_code,
                      title: job.title,
                      customerName: job.customer_name,
                    },
                    customerId: job.customer_id ?? null,
                    isWalkIn: !job.customer_id,
                    documentType: 'quote',
                    lines: job.lines.map((line, index) => ({
                      kind: 'manual' as const,
                      description: line.description || `${t('creative.detail.lineDescription', { ns: 'app' })} ${index + 1}`,
                      qty: Number(line.quantity ?? 1),
                      unitPrice: Number(line.unit_price ?? 0),
                      categoryName: job.job_type_name ?? t('creative.module', { ns: 'app' }),
                      sourceType: 'creative_job',
                      sourceId: line.id,
                    })),
                  },
                },
              })
            }
          >
            {t('creative.detail.openInPos', { ns: 'app' })}
          </Button>
          <Link to="/creative/jobs">{t('creative.detail.backToJobs', { ns: 'app' })}</Link>
        </div>
      </header>

      <section className="ops-summary-grid">
        <article className="panel ops-summary-card">
          <Boxes size={20} />
          <strong>{job.lines.length}</strong>
          <span>{t('creative.detail.linesTitle', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <Store size={20} />
          <strong>{job.vendorTasks.length}</strong>
          <span>{t('creative.detail.vendorTasksTitle', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <Clock3 size={20} />
          <strong>{formatDate(job.deadline_at, locale)}</strong>
          <span>{t('creative.deadline', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <History size={20} />
          <strong>{job.history.length}</strong>
          <span>{t('creative.detail.statusHistoryTitle', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <ReceiptText size={20} />
          <strong>{formatNumber(quotedTotal, locale)}</strong>
          <span>{t('creative.detail.estimatedTotal', { ns: 'app' })}</span>
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel entity-form">
          <div className="detail-stack">
            <h2>{job.title}</h2>
            <p className="muted">{job.description || t('empty', { ns: 'common' })}</p>
          </div>
          <div className="ops-meta-grid">
            <div>
              <strong>{t('creative.jobTypeLabel', { ns: 'app' })}</strong>
              <span>{job.job_type_name ?? t('creative.typeNone', { ns: 'app' })}</span>
            </div>
            <div>
              <strong>{t('creative.customerLabel', { ns: 'app' })}</strong>
              <span>{job.customer_name ?? t('creative.customerNone', { ns: 'app' })}</span>
            </div>
            <div>
              <strong>{t('creative.status', { ns: 'app' })}</strong>
              <Badge tone={creativeStatusTone(job.status)}>{formatCreativeStatus(job.status, t)}</Badge>
            </div>
            <div>
              <strong>{t('creative.detail.createdAt', { ns: 'app' })}</strong>
              <span>{formatDate(job.created_at, locale, true)}</span>
            </div>
            <div>
              <strong>{t('creative.deadline', { ns: 'app' })}</strong>
              <span>{formatDate(job.deadline_at, locale)}</span>
            </div>
          </div>
        </article>

        <aside className="panel entity-form">
          <h2>{t('creative.detail.changeStatus', { ns: 'app' })}</h2>
          <form className="entity-form" onSubmit={changeStatus}>
            <Select label={t('creative.detail.newStatus', { ns: 'app' })} value={statusTo} onChange={(event) => setStatusTo(event.target.value)}>
              {creativeStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatCreativeStatus(status, t)}
                </option>
              ))}
            </Select>
            <Textarea label={t('creative.detail.statusNotes', { ns: 'app' })} value={statusNotes} onChange={(event) => setStatusNotes(event.target.value)} />
            <Button type="submit" isLoading={changeStatusMutation.isPending}>
              {t('creative.detail.changeStatus', { ns: 'app' })}
            </Button>
          </form>
        </aside>
      </section>

      <section className="detail-grid">
        <article className="panel entity-form">
          <h2>{t('creative.detail.linesTitle', { ns: 'app' })}</h2>
          <DataTable
            rows={job.lines}
            getRowKey={(line) => line.id}
            emptyText={t('creative.detail.noLines', { ns: 'app' })}
            columns={[
              { key: 'description', header: t('creative.detail.lineDescription', { ns: 'app' }), render: (line) => line.description ?? t('empty', { ns: 'common' }) },
              { key: 'quantity', header: t('creative.detail.quantity', { ns: 'app' }), render: (line) => formatNumber(line.quantity, locale) },
              { key: 'unit_price', header: t('creative.detail.unitPrice', { ns: 'app' }), render: (line) => formatNumber(line.unit_price, locale) },
              { key: 'line_total', header: t('creative.detail.lineTotal', { ns: 'app' }), render: (line) => formatNumber(line.line_total, locale) },
            ]}
          />
          <form className="entity-form" onSubmit={addLine}>
            <Input label={t('creative.detail.lineDescription', { ns: 'app' })} value={lineDesc} onChange={(event) => setLineDesc(event.target.value)} required />
            <Input
              label={t('creative.detail.quantity', { ns: 'app' })}
              type="number"
              min={0.0001}
              step={0.0001}
              value={String(quantity)}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
            <Input
              label={t('creative.detail.unitPrice', { ns: 'app' })}
              type="number"
              min={0}
              step={0.01}
              value={String(unitPrice)}
              onChange={(event) => setUnitPrice(Number(event.target.value))}
            />
            <Button type="submit" isLoading={addLineMutation.isPending}>
              {t('creative.detail.addLine', { ns: 'app' })}
            </Button>
          </form>
        </article>

        <aside className="panel entity-form">
          <h2>{t('creative.detail.vendorTasksTitle', { ns: 'app' })}</h2>
          <DataTable
            rows={job.vendorTasks}
            getRowKey={(task) => task.id}
            emptyText={t('creative.detail.noVendorTasks', { ns: 'app' })}
            columns={[
              { key: 'vendor', header: t('creative.detail.vendor', { ns: 'app' }), render: (task) => task.vendor_name ?? t('empty', { ns: 'common' }) },
              { key: 'code', header: t('creative.detail.taskCode', { ns: 'app' }), render: (task) => task.external_task_code ?? t('empty', { ns: 'common' }) },
              { key: 'status', header: t('creative.status', { ns: 'app' }), render: (task) => <Badge tone={creativeStatusTone(task.status)}>{formatCreativeStatus(task.status, t)}</Badge> },
            ]}
          />
          <form className="entity-form" onSubmit={createTask}>
            <Select label={t('creative.detail.selectVendor', { ns: 'app' })} value={vendorId} onChange={(event) => setVendorId(event.target.value)} required>
              <option value="">{t('creative.detail.selectVendor', { ns: 'app' })}</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.code} - {vendor.name}
                </option>
              ))}
            </Select>
            <Input label={t('creative.detail.taskCode', { ns: 'app' })} value={externalTaskCode} onChange={(event) => setExternalTaskCode(event.target.value)} />
            <Textarea label={t('creative.detail.taskNotes', { ns: 'app' })} value={vendorTaskNotes} onChange={(event) => setVendorTaskNotes(event.target.value)} />
            <Button type="submit" isLoading={createTaskMutation.isPending}>
              {t('creative.detail.createVendorTask', { ns: 'app' })}
            </Button>
          </form>
        </aside>
      </section>

      <section className="panel entity-form">
        <h2>{t('creative.detail.statusHistoryTitle', { ns: 'app' })}</h2>
        <DataTable
          rows={job.history}
          getRowKey={(item) => item.id}
          emptyText={t('creative.detail.noHistory', { ns: 'app' })}
          columns={[
            {
              key: 'transition',
              header: t('creative.status', { ns: 'app' }),
              render: (item) =>
                `${formatCreativeStatus(item.from_status || 'draft', t)} -> ${formatCreativeStatus(item.to_status, t)}`,
            },
            { key: 'notes', header: t('creative.detail.taskNotes', { ns: 'app' }), render: (item) => item.notes || t('empty', { ns: 'common' }) },
            { key: 'created_at', header: t('creative.detail.createdAt', { ns: 'app' }), render: (item) => formatDate(item.created_at, locale, true) },
          ]}
        />
      </section>
    </div>
  );
}

export default JobDetailPage;
