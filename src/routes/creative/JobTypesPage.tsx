import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers3, ListFilter, Plus, Tags } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import creativeApi from '../../modules/creative/api/creative.api';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export function JobTypesPage() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const typesQuery = useQuery({ queryKey: ['creativeJobTypes'], queryFn: creativeApi.listJobTypes });
  const createMutation = useMutation({
    mutationFn: creativeApi.createJobType,
    onSuccess: async () => {
      setIsCreateOpen(false);
      setCode('');
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['creativeJobTypes'] });
    },
  });

  const items = typesQuery.data?.items ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = items.filter((type) => {
    if (!normalizedSearch) {
      return true;
    }

    return [type.code, type.default_name]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  });
  const namedTypes = items.filter((type) => (type.default_name ?? '').trim().length > 0).length;

  async function createType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code.trim() || !name.trim()) {
      return;
    }

    await createMutation.mutateAsync({ code: code.trim().toUpperCase(), defaultName: name.trim() });
  }

  return (
    <div className="ops-dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('creative.module', { ns: 'app' })}</p>
          <h1>{t('creative.jobTypesTitle', { ns: 'app' })}</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={<Tags size={18} />} onClick={() => navigate('/creative/jobs')}>
            {t('creative.jobsTitle', { ns: 'app' })}
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
            {t('creative.create', { ns: 'app' })}
          </Button>
        </div>
      </header>

      <section className="panel ops-hero">
        <div className="ops-hero-copy">
          <h2>{t('creative.jobTypesTitle', { ns: 'app' })}</h2>
          <p className="muted">{t('creative.jobTypesDescription', { ns: 'app' })}</p>
        </div>
        <div className="ops-inline-pills">
          <Badge tone="info">{t('creative.stats.totalTypes', { ns: 'app', total: items.length })}</Badge>
        </div>
      </section>

      <section className="ops-summary-grid">
        <article className="panel ops-summary-card">
          <Layers3 size={20} />
          <strong>{items.length}</strong>
          <span>{t('creative.stats.totalTypes', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <ListFilter size={20} />
          <strong>{filteredItems.length}</strong>
          <span>{t('creative.stats.filteredTypes', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <Tags size={20} />
          <strong>{namedTypes}</strong>
          <span>{t('creative.stats.namedTypes', { ns: 'app' })}</span>
        </article>
      </section>

      <section className="panel ops-panel">
        <div className="ops-panel-header">
          <div className="entity-toolbar-copy">
            <h2>{t('creative.typeDirectoryTitle', { ns: 'app' })}</h2>
            <p className="muted">{t('creative.typeDirectoryDescription', { ns: 'app' })}</p>
          </div>
        </div>

        <div className="ops-filter-grid">
          <div className="ops-filter-search">
            <span>{t('creative.typeSearchLabel', { ns: 'app' })}</span>
            <SearchInput
              aria-label={t('creative.typeSearchLabel', { ns: 'app' })}
              placeholder={t('creative.typeSearchPlaceholder', { ns: 'app' })}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {typesQuery.isError ? <ErrorState title={t('errors.routeErrorTitle', { ns: 'common' })} description={t('creative.noJobTypes', { ns: 'app' })} /> : null}

        <DataTable
          rows={filteredItems}
          isLoading={typesQuery.isLoading}
          emptyText={search ? t('creative.noFilteredJobTypes', { ns: 'app' }) : t('creative.noJobTypes', { ns: 'app' })}
          getRowKey={(type) => type.id}
          columns={[
            { key: 'code', header: t('creative.codeLabel', { ns: 'app' }), render: (type) => <Badge tone="info">{type.code || '-'}</Badge> },
            {
              key: 'name',
              header: t('creative.defaultNameLabel', { ns: 'app' }),
              render: (type) => (
                <div className="detail-stack">
                  <strong>{type.default_name || '-'}</strong>
                  <span className="muted">#{type.id}</span>
                </div>
              ),
            },
          ]}
        />
      </section>

      <FormDrawer title={t('creative.jobTypesTitle', { ns: 'app' })} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form className="entity-form" onSubmit={createType}>
          <Input label={t('creative.codeLabel', { ns: 'app' })} value={code} onChange={(event) => setCode(event.target.value)} required />
          <Input label={t('creative.defaultNameLabel', { ns: 'app' })} value={name} onChange={(event) => setName(event.target.value)} required />
          <Button type="submit" isLoading={createMutation.isPending}>
            {t('creative.create', { ns: 'app' })}
          </Button>
        </form>
      </FormDrawer>
    </div>
  );
}

export default JobTypesPage;
