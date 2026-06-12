import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Layers3, ListFilter, ListTree, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../../modules/projects/api/projects.api';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Textarea } from '../../shared/ui/Textarea';

export function ProjectTypesPage() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [defaultName, setDefaultName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();
  const typesQuery = useQuery({ queryKey: ['projectTypes'], queryFn: projectsApi.listTypes });
  const createMutation = useMutation({
    mutationFn: projectsApi.createType,
    onSuccess: async () => {
      setIsCreateOpen(false);
      setCode('');
      setDefaultName('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
    },
  });

  const items = typesQuery.data?.items ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = items.filter((type) => {
    if (!normalizedSearch) {
      return true;
    }

    return [type.code, type.default_name, type.description ?? '']
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  });
  const describedCount = items.filter((type) => (type.description ?? '').trim().length > 0).length;

  async function createType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || !defaultName.trim()) return;
    await createMutation.mutateAsync({ code: code.trim().toUpperCase(), defaultName: defaultName.trim(), description: description.trim() || null });
  }

  return (
    <div className="ops-dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('projects.module', { ns: 'app' })}</p>
          <h1>{t('projects.projectTypesTitle', { ns: 'app' })}</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={<ListTree size={18} />} onClick={() => navigate('/projects')}>
            {t('projects.listTitle', { ns: 'app' })}
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
            {t('projects.newType', { ns: 'app' })}
          </Button>
        </div>
      </header>

      <section className="panel ops-hero">
        <div className="ops-hero-copy">
          <h2>{t('projects.projectTypesTitle', { ns: 'app' })}</h2>
          <p className="muted">{t('projects.typesDescription', { ns: 'app' })}</p>
        </div>
        <div className="ops-inline-pills">
          <Badge tone="info">{t('projects.stats.totalTypes', { ns: 'app', total: items.length })}</Badge>
        </div>
      </section>

      <section className="ops-summary-grid">
        <article className="panel ops-summary-card">
          <Layers3 size={20} />
          <strong>{items.length}</strong>
          <span>{t('projects.stats.totalTypes', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <FileText size={20} />
          <strong>{describedCount}</strong>
          <span>{t('projects.stats.describedTypes', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <ListFilter size={20} />
          <strong>{filteredItems.length}</strong>
          <span>{t('projects.stats.filteredTypes', { ns: 'app' })}</span>
        </article>
      </section>

      <section className="panel ops-panel">
        <div className="ops-panel-header">
          <div className="entity-toolbar-copy">
            <h2>{t('projects.typeDirectoryTitle', { ns: 'app' })}</h2>
            <p className="muted">{t('projects.typeDirectoryDescription', { ns: 'app' })}</p>
          </div>
        </div>

        <div className="ops-filter-grid">
          <div className="ops-filter-search">
            <span>{t('projects.searchTypes', { ns: 'app' })}</span>
            <SearchInput
              aria-label={t('projects.searchTypes', { ns: 'app' })}
              placeholder={t('projects.typeSearchPlaceholder', { ns: 'app' })}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {typesQuery.isError ? <ErrorState title={t('errors.routeErrorTitle', { ns: 'common' })} description={t('projects.loadTypesFailed', { ns: 'app' })} /> : null}

        <DataTable
          rows={filteredItems}
          isLoading={typesQuery.isLoading}
          emptyText={search ? t('projects.noFilteredTypes', { ns: 'app' }) : t('projects.noTypes', { ns: 'app' })}
          getRowKey={(type) => type.id}
          columns={[
            { key: 'code', header: t('projects.code', { ns: 'app' }), render: (type) => <Badge tone="info">{type.code}</Badge> },
            {
              key: 'name',
              header: t('projects.name', { ns: 'app' }),
              render: (type) => (
                <div className="detail-stack">
                  <strong>{type.default_name}</strong>
                  <span className="muted">#{type.id}</span>
                </div>
              ),
            },
            { key: 'description', header: t('projects.description', { ns: 'app' }), render: (type) => type.description ?? '-' },
          ]}
        />
      </section>

      <FormDrawer title={t('projects.newProjectType', { ns: 'app' })} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form className="entity-form" onSubmit={createType}>
          <Input label={t('projects.code', { ns: 'app' })} value={code} onChange={(event) => setCode(event.target.value)} required />
          <Input label={t('projects.name', { ns: 'app' })} value={defaultName} onChange={(event) => setDefaultName(event.target.value)} required />
          <Textarea label={t('projects.description', { ns: 'app' })} value={description} onChange={(event) => setDescription(event.target.value)} />
          <Button type="submit" isLoading={createMutation.isPending}>
            {t('projects.createType', { ns: 'app' })}
          </Button>
        </form>
      </FormDrawer>
    </div>
  );
}
