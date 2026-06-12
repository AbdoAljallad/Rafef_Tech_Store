import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BrushCleaning, Clock3, Layers3, Plus, Store, Tags } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import creativeApi from '../../modules/creative/api/creative.api';
import { crmApi } from '../../modules/crm/api/crm.api';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
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

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

export function JobsPage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = resolveLocale(i18n.resolvedLanguage);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [title, setTitle] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');

  const jobsQuery = useQuery({ queryKey: ['creativeJobs'], queryFn: creativeApi.listJobs });
  const jobTypesQuery = useQuery({ queryKey: ['creativeJobTypes'], queryFn: creativeApi.listJobTypes });
  const customersQuery = useQuery({ queryKey: ['customers', 'creative-jobs', customerSearch], queryFn: () => crmApi.listCustomers(customerSearch) });
  const createMutation = useMutation({
    mutationFn: creativeApi.createJob,
    onSuccess: async (response) => {
      setIsCreateOpen(false);
      setTitle('');
      setJobTypeId('');
      setCustomerId('');
      setCustomerSearch('');
      setDescription('');
      setDeadlineAt('');
      await queryClient.invalidateQueries({ queryKey: ['creativeJobs'] });
      navigate(`/creative/jobs/${response.job.id}`);
    },
  });

  const items = jobsQuery.data?.items ?? [];
  const filteredItems = items.filter((job) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      job.job_code.toLowerCase().includes(normalizedSearch) ||
      job.title.toLowerCase().includes(normalizedSearch) ||
      (job.customer_name ?? '').toLowerCase().includes(normalizedSearch) ||
      (job.job_type_name ?? '').toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesType = jobTypeFilter === 'all' || String(job.job_type_id ?? '') === jobTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  const activeCount = items.filter((job) => job.status === 'pending' || job.status === 'in_progress').length;
  const completedCount = items.filter((job) => job.status === 'completed').length;
  const totalVendorTasks = items.reduce((sum, job) => sum + Number(job.vendor_task_count ?? 0), 0);
  const linkedCustomerCount = items.filter((job) => job.customer_id !== null).length;

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    await createMutation.mutateAsync({
      jobTypeId: jobTypeId ? Number(jobTypeId) : null,
      customerId: customerId ? Number(customerId) : null,
      title: title.trim(),
      description: description.trim() || null,
      deadlineAt: deadlineAt || null,
    });
  }

  return (
    <div className="ops-dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('creative.module', { ns: 'app' })}</p>
          <h1>{t('creative.jobsTitle', { ns: 'app' })}</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={<Tags size={18} />} onClick={() => navigate('/creative/job-types')}>
            {t('creative.jobTypesTitle', { ns: 'app' })}
          </Button>
          <Button variant="secondary" icon={<Store size={18} />} onClick={() => navigate('/creative/vendors')}>
            {t('creative.vendorsTitle', { ns: 'app' })}
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
            {t('creative.newJob', { ns: 'app' })}
          </Button>
        </div>
      </header>

      <section className="panel ops-hero">
        <div className="ops-hero-copy">
          <h2>{t('creative.operationsTitle', { ns: 'app' })}</h2>
          <p className="muted">{t('creative.operationsDescription', { ns: 'app' })}</p>
        </div>
        <div className="ops-inline-pills">
          <Badge tone="info">{t('creative.liveBoard', { ns: 'app' })}</Badge>
          <Badge tone="neutral">{t('creative.jobCount', { ns: 'app', total: items.length })}</Badge>
        </div>
      </section>

      <section className="ops-summary-grid">
        <article className="panel ops-summary-card">
          <Layers3 size={20} />
          <strong>{items.length}</strong>
          <span>{t('creative.stats.total', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <BrushCleaning size={20} />
          <strong>{activeCount}</strong>
          <span>{t('creative.stats.active', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <Clock3 size={20} />
          <strong>{completedCount}</strong>
          <span>{t('creative.stats.completed', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <Store size={20} />
          <strong>{totalVendorTasks}</strong>
          <span>{t('creative.stats.vendorTasks', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <Store size={20} />
          <strong>{linkedCustomerCount}</strong>
          <span>{t('creative.stats.linkedCustomers', { ns: 'app' })}</span>
        </article>
      </section>

      <section className="panel ops-panel">
        <div className="ops-panel-header">
          <div className="entity-toolbar-copy">
            <h2>{t('creative.boardTitle', { ns: 'app' })}</h2>
            <p className="muted">{t('creative.boardDescription', { ns: 'app' })}</p>
          </div>
        </div>

        <div className="ops-filter-grid">
          <div className="ops-filter-search">
            <span>{t('creative.filters.search', { ns: 'app' })}</span>
            <SearchInput
              aria-label={t('creative.filters.search', { ns: 'app' })}
              placeholder={t('creative.searchPlaceholder', { ns: 'app' })}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select label={t('creative.filters.status', { ns: 'app' })} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{t('creative.filters.allStatuses', { ns: 'app' })}</option>
            {creativeStatuses.map((status) => (
              <option key={status} value={status}>
                {formatCreativeStatus(status, t)}
              </option>
            ))}
          </Select>
          <Select label={t('creative.filters.jobType', { ns: 'app' })} value={jobTypeFilter} onChange={(event) => setJobTypeFilter(event.target.value)}>
            <option value="all">{t('creative.filters.allTypes', { ns: 'app' })}</option>
            {(jobTypesQuery.data?.items ?? []).map((type) => (
              <option key={type.id} value={type.id}>
                {type.default_name}
              </option>
            ))}
          </Select>
        </div>

        {jobsQuery.isError ? <ErrorState title={t('errors.routeErrorTitle', { ns: 'common' })} description={t('creative.loadJobsFailed', { ns: 'app' })} /> : null}

        <DataTable
          rows={filteredItems}
          isLoading={jobsQuery.isLoading}
          emptyText={search || statusFilter !== 'all' || jobTypeFilter !== 'all' ? t('creative.noFilteredJobs', { ns: 'app' }) : t('creative.noJobs', { ns: 'app' })}
          getRowKey={(job) => job.id}
          onRowClick={(job) => navigate(`/creative/jobs/${job.id}`)}
          columns={[
            { key: 'code', header: t('creative.codeLabel', { ns: 'app' }), render: (job) => job.job_code },
            {
              key: 'title',
              header: t('creative.titleLabel', { ns: 'app' }),
              render: (job) => (
                <div className="detail-stack">
                  <strong>{job.title}</strong>
                  <span className="muted">{job.job_type_name ?? t('creative.typeNone', { ns: 'app' })}</span>
                </div>
              ),
            },
            { key: 'customer', header: t('creative.customerLabel', { ns: 'app' }), render: (job) => job.customer_name ?? t('creative.customerNone', { ns: 'app' }) },
            { key: 'deadline', header: t('creative.deadline', { ns: 'app' }), render: (job) => formatDate(job.deadline, locale) },
            {
              key: 'workload',
              header: t('creative.workload', { ns: 'app' }),
              render: (job) => t('creative.workloadValue', { ns: 'app', lines: job.line_count, tasks: job.vendor_task_count }),
            },
            {
              key: 'status',
              header: t('creative.status', { ns: 'app' }),
              render: (job) => <Badge tone={creativeStatusTone(job.status)}>{formatCreativeStatus(job.status, t)}</Badge>,
            },
          ]}
        />
      </section>

      <FormDrawer title={t('creative.newJob', { ns: 'app' })} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form className="entity-form" onSubmit={createJob}>
          <Select label={t('creative.jobTypeLabel', { ns: 'app' })} value={jobTypeId} onChange={(event) => setJobTypeId(event.target.value)}>
            <option value="">{t('creative.typeNone', { ns: 'app' })}</option>
            {(jobTypesQuery.data?.items ?? []).map((type) => (
              <option key={type.id} value={type.id}>
                {type.default_name}
              </option>
            ))}
          </Select>
          <Input label={t('creative.customerSearchLabel', { ns: 'app' })} value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />
          <Select label={t('creative.customerLabel', { ns: 'app' })} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">{t('creative.customerNone', { ns: 'app' })}</option>
            {(customersQuery.data?.items ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customer_code} - {customer.name}
              </option>
            ))}
          </Select>
          <Input label={t('creative.titleLabel', { ns: 'app' })} value={title} onChange={(event) => setTitle(event.target.value)} required />
          <Textarea label={t('creative.descriptionLabel', { ns: 'app' })} value={description} onChange={(event) => setDescription(event.target.value)} />
          <Input label={t('creative.deadlineLabel', { ns: 'app' })} type="date" value={deadlineAt} onChange={(event) => setDeadlineAt(event.target.value)} />
          <Button type="submit" isLoading={createMutation.isPending}>
            {t('creative.create', { ns: 'app' })}
          </Button>
        </form>
      </FormDrawer>
    </div>
  );
}

export default JobsPage;
