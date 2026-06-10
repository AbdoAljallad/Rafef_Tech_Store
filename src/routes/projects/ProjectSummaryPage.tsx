import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../modules/projects/api/projects.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';

function formatProjectStatus(status: string | null | undefined, t: (key: string, options?: any) => string) {
  if (!status) {
    return '-';
  }

  return String(t(`projects.statusOptions.${status}`));
}

export function ProjectSummaryPage() {
  const { t } = useTranslation('app');
  const { id } = useParams();
  const summaryQuery = useQuery({ queryKey: ['projectSummary', id], queryFn: () => projectsApi.summary(Number(id)), enabled: Boolean(id) });
  const summary = summaryQuery.data?.summary;
  const project = summary?.project;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('projects.module')}</p>
          <h1>{t('projects.summaryTitle', { code: project?.project_code ?? id })}</h1>
        </div>
        <Link to={`/projects/${id}`}>{t('projects.backToDetail')}</Link>
      </header>

      <section className="panel entity-summary">
        <h2>{project?.title ?? t('projects.loadingSummary')}</h2>
        <p><strong>{t('projects.status')}:</strong> {formatProjectStatus(project?.status, t)}</p>
        <p><strong>{t('projects.type')}:</strong> {summary?.projectType?.default_name ?? '-'}</p>
        <p><strong>{t('projects.customer')}:</strong> {summary?.customer?.name ?? '-'}</p>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>{t('projects.sites')}</h2>
          <DataTable
            rows={project?.sites ?? []}
            isLoading={summaryQuery.isLoading}
            emptyText={t('projects.noSites')}
            getRowKey={(site) => site.id}
            columns={[
              { key: 'name', header: t('projects.site'), render: (site) => site.site_name },
              { key: 'address', header: t('projects.address'), render: (site) => site.address_text ?? '-' },
            ]}
          />
        </article>
        <article className="panel">
          <h2>{t('projects.materials')}</h2>
          <DataTable
            rows={project?.materials ?? []}
            isLoading={summaryQuery.isLoading}
            emptyText={t('projects.noMaterials')}
            getRowKey={(material) => material.id}
            columns={[
              { key: 'product', header: t('projects.product'), render: (material) => material.product_name_snapshot },
              { key: 'qty', header: t('projects.qty'), render: (material) => material.quantity },
              { key: 'reservation', header: t('projects.reservation'), render: (material) => material.reservation_id },
            ]}
          />
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>{t('projects.installedAssets')}</h2>
          <DataTable
            rows={project?.installedAssets ?? []}
            isLoading={summaryQuery.isLoading}
            emptyText={t('projects.noInstalledAssets')}
            getRowKey={(asset) => asset.id}
            columns={[
              { key: 'type', header: t('projects.assetType'), render: (asset) => asset.asset_type },
              { key: 'name', header: t('projects.name'), render: (asset) => asset.asset_name },
              { key: 'serial', header: t('projects.serial'), render: (asset) => asset.serial_no ?? '-' },
              { key: 'ip', header: t('projects.ip'), render: (asset) => asset.ip_address ?? '-' },
            ]}
          />
        </article>
        <article className="panel">
          <h2>{t('projects.notes')}</h2>
          <ul>{(project?.notes ?? []).map((note) => <li key={note.id}>{note.note_text}</li>)}</ul>
          <h2>{t('projects.statusHistory')}</h2>
          <ul>{(project?.history ?? []).map((item) => <li key={item.id}>{item.from_status ?? '-'} - {item.to_status} ({item.stage_code ?? '-'})</li>)}</ul>
        </article>
      </section>
    </>
  );
}
