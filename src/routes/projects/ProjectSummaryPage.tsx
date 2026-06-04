import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { projectsApi } from '../../modules/projects/api/projects.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';

export function ProjectSummaryPage() {
  const { id } = useParams();
  const summaryQuery = useQuery({ queryKey: ['projectSummary', id], queryFn: () => projectsApi.summary(Number(id)), enabled: Boolean(id) });
  const summary = summaryQuery.data?.summary;
  const project = summary?.project;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>Project Summary {project?.project_code ?? id}</h1>
        </div>
        <Link to={`/projects/${id}`}>Back to detail</Link>
      </header>

      <section className="panel entity-summary">
        <h2>{project?.title ?? 'Loading summary...'}</h2>
        <p><strong>Status:</strong> {project?.status ?? '-'}</p>
        <p><strong>Type:</strong> {summary?.projectType?.default_name ?? '-'}</p>
        <p><strong>Customer:</strong> {summary?.customer?.name ?? '-'}</p>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>Sites</h2>
          <DataTable
            rows={project?.sites ?? []}
            isLoading={summaryQuery.isLoading}
            emptyText="No sites"
            getRowKey={(site) => site.id}
            columns={[
              { key: 'name', header: 'Site', render: (site) => site.site_name },
              { key: 'address', header: 'Address', render: (site) => site.address_text ?? '-' },
            ]}
          />
        </article>
        <article className="panel">
          <h2>Materials</h2>
          <DataTable
            rows={project?.materials ?? []}
            isLoading={summaryQuery.isLoading}
            emptyText="No materials"
            getRowKey={(material) => material.id}
            columns={[
              { key: 'product', header: 'Product', render: (material) => material.product_name_snapshot },
              { key: 'qty', header: 'Qty', render: (material) => material.quantity },
              { key: 'reservation', header: 'Reservation', render: (material) => material.reservation_id },
            ]}
          />
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>Installed Assets</h2>
          <DataTable
            rows={project?.installedAssets ?? []}
            isLoading={summaryQuery.isLoading}
            emptyText="No installed assets"
            getRowKey={(asset) => asset.id}
            columns={[
              { key: 'type', header: 'Type', render: (asset) => asset.asset_type },
              { key: 'name', header: 'Name', render: (asset) => asset.asset_name },
              { key: 'serial', header: 'Serial', render: (asset) => asset.serial_no ?? '-' },
              { key: 'ip', header: 'IP', render: (asset) => asset.ip_address ?? '-' },
            ]}
          />
        </article>
        <article className="panel">
          <h2>Notes</h2>
          <ul>{(project?.notes ?? []).map((note) => <li key={note.id}>{note.note_text}</li>)}</ul>
          <h2>Status History</h2>
          <ul>{(project?.history ?? []).map((item) => <li key={item.id}>{item.from_status ?? '-'} - {item.to_status} ({item.stage_code ?? 'stage n/a'})</li>)}</ul>
        </article>
      </section>
    </>
  );
}
