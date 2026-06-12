import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ListTree, Plus, Radar, UserRoundSearch } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../../modules/crm/api/crm.api';
import { projectsApi } from '../../modules/projects/api/projects.api';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

function resolveLocale(language?: string) {
  return language?.startsWith('ar') ? 'ar' : 'ru';
}

function formatProjectStatus(status: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`projects.statusOptions.${status}`, { ns: 'app', defaultValue: status });
}

function projectStatusTone(status: string) {
  if (status === 'completed') {
    return 'success' as const;
  }

  if (status === 'cancelled') {
    return 'danger' as const;
  }

  if (status === 'in_progress') {
    return 'info' as const;
  }

  if (status === 'on_hold') {
    return 'warning' as const;
  }

  return 'neutral' as const;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

export function ProjectsPage() {
  const { t, i18n } = useTranslation('app');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = resolveLocale(i18n.resolvedLanguage);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [projectTypeId, setProjectTypeId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [plannedStartAt, setPlannedStartAt] = useState('');
  const [plannedEndAt, setPlannedEndAt] = useState('');

  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.listProjects({ offset: 0, limit: 100 }) });
  const typesQuery = useQuery({ queryKey: ['projectTypes'], queryFn: projectsApi.listTypes });
  const customersQuery = useQuery({ queryKey: ['customers', customerSearch], queryFn: () => crmApi.listCustomers(customerSearch) });
  const createMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: async (response) => {
      setIsCreateOpen(false);
      setProjectTypeId('');
      setCustomerId('');
      setTitle('');
      setDescription('');
      setPlannedStartAt('');
      setPlannedEndAt('');
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${response.project.id}`);
    },
  });

  const projects = projectsQuery.data?.items ?? [];
  const filteredProjects = projects.filter((project) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      project.project_code.toLowerCase().includes(normalizedSearch) ||
      project.title.toLowerCase().includes(normalizedSearch) ||
      (project.customer_name ?? '').toLowerCase().includes(normalizedSearch) ||
      (project.project_type_name ?? '').toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesType = typeFilter === 'all' || String(project.project_type_id ?? '') === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  const activeCount = projects.filter((project) => ['planned', 'in_progress', 'on_hold'].includes(project.status)).length;
  const completedCount = projects.filter((project) => project.status === 'completed').length;
  const linkedCustomerCount = projects.filter((project) => project.customer_id !== null).length;

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    await createMutation.mutateAsync({
      projectTypeId: projectTypeId ? Number(projectTypeId) : null,
      customerId: customerId ? Number(customerId) : null,
      title: title.trim(),
      description: description.trim() || null,
      plannedStartAt: plannedStartAt || null,
      plannedEndAt: plannedEndAt || null,
    });
  }

  return (
    <div className="ops-dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('projects.module')}</p>
          <h1>{t('projects.listTitle')}</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={<ListTree size={18} />} onClick={() => navigate('/projects/types')}>
            {t('projects.typesButton')}
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
            {t('projects.newProject')}
          </Button>
        </div>
      </header>

      <section className="panel ops-hero">
        <div className="ops-hero-copy">
          <h2>{t('projects.listTitle')}</h2>
          <p className="muted">{t('projects.listDescription')}</p>
        </div>
        <div className="ops-inline-pills">
          <Badge tone="info">{t('projects.filters.allStatuses')}</Badge>
          <Badge tone="neutral">{t('projects.projectCount', { total: projects.length })}</Badge>
        </div>
      </section>

      <section className="ops-summary-grid">
        <article className="panel ops-summary-card">
          <Radar size={20} />
          <strong>{projects.length}</strong>
          <span>{t('projects.stats.total')}</span>
        </article>
        <article className="panel ops-summary-card">
          <ListTree size={20} />
          <strong>{activeCount}</strong>
          <span>{t('projects.stats.active')}</span>
        </article>
        <article className="panel ops-summary-card">
          <CheckCircle2 size={20} />
          <strong>{completedCount}</strong>
          <span>{t('projects.stats.completed')}</span>
        </article>
        <article className="panel ops-summary-card">
          <UserRoundSearch size={20} />
          <strong>{linkedCustomerCount}</strong>
          <span>{t('projects.stats.linkedCustomers')}</span>
        </article>
      </section>

      <section className="panel ops-panel">
        <div className="ops-panel-header">
          <div className="entity-toolbar-copy">
            <h2>{t('projects.boardTitle')}</h2>
            <p className="muted">{t('projects.boardDescription')}</p>
          </div>
        </div>

        <div className="ops-filter-grid">
          <div className="ops-filter-search">
            <span>{t('projects.searchLabel')}</span>
            <SearchInput
              aria-label={t('projects.searchLabel')}
              placeholder={t('projects.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select label={t('projects.filters.status')} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{t('projects.filters.allStatuses')}</option>
            {['draft', 'planned', 'in_progress', 'on_hold', 'completed', 'cancelled'].map((status) => (
              <option key={status} value={status}>
                {formatProjectStatus(status, t)}
              </option>
            ))}
          </Select>
          <Select label={t('projects.filters.type')} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">{t('projects.filters.allTypes')}</option>
            {(typesQuery.data?.items ?? []).map((type) => (
              <option key={type.id} value={type.id}>
                {type.default_name}
              </option>
            ))}
          </Select>
        </div>

        {projectsQuery.isError ? <ErrorState title={t('projects.loadProjectsFailed')} description={t('projects.noProjects')} /> : null}

        <DataTable
          rows={filteredProjects}
          isLoading={projectsQuery.isLoading}
          emptyText={search || statusFilter !== 'all' || typeFilter !== 'all' ? t('projects.noFilteredProjects') : t('projects.noProjects')}
          getRowKey={(project) => project.id}
          onRowClick={(project) => navigate(`/projects/${project.id}`)}
          columns={[
            { key: 'code', header: t('projects.code'), render: (project) => project.project_code },
            {
              key: 'title',
              header: t('projects.name'),
              render: (project) => (
                <div className="detail-stack">
                  <strong>{project.title}</strong>
                  <span className="muted">{project.project_type_name ?? t('projects.typeNone')}</span>
                </div>
              ),
            },
            { key: 'customer', header: t('projects.customer'), render: (project) => project.customer_name ?? t('projects.customerNone') },
            { key: 'created', header: t('events.time'), render: (project) => formatDate(project.created_at, locale) },
            { key: 'status', header: t('projects.status'), render: (project) => <Badge tone={projectStatusTone(project.status)}>{formatProjectStatus(project.status, t)}</Badge> },
          ]}
        />
      </section>

      <FormDrawer title={t('projects.newProjectTitle')} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form className="entity-form" onSubmit={createProject}>
          <Select label={t('projects.typeLabel')} value={projectTypeId} onChange={(event) => setProjectTypeId(event.target.value)}>
            <option value="">{t('projects.typeNone')}</option>
            {(typesQuery.data?.items ?? []).map((type) => (
              <option key={type.id} value={type.id}>
                {type.default_name}
              </option>
            ))}
          </Select>
          <Input label={t('projects.customerSearch')} value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />
          <Select label={t('projects.customer')} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">{t('projects.customerNone')}</option>
            {(customersQuery.data?.items ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customer_code} - {customer.name}
              </option>
            ))}
          </Select>
          <Input label={t('projects.name')} value={title} onChange={(event) => setTitle(event.target.value)} required />
          <Textarea label={t('projects.description')} value={description} onChange={(event) => setDescription(event.target.value)} />
          <Input label={t('projects.plannedStart')} type="date" value={plannedStartAt} onChange={(event) => setPlannedStartAt(event.target.value)} />
          <Input label={t('projects.plannedEnd')} type="date" value={plannedEndAt} onChange={(event) => setPlannedEndAt(event.target.value)} />
          <Button type="submit" isLoading={createMutation.isPending}>
            {t('projects.createProject')}
          </Button>
        </form>
      </FormDrawer>
    </div>
  );
}
