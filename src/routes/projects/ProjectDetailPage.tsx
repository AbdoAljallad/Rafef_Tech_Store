import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { projectsApi } from '../../modules/projects/api/projects.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

const statuses = ['draft', 'planned', 'in_progress', 'on_hold', 'completed', 'cancelled'];

export function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [stageCode, setStageCode] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [materialProductId, setMaterialProductId] = useState('');
  const [materialQty, setMaterialQty] = useState(1);
  const [materialNotes, setMaterialNotes] = useState('');
  const [reservationResult, setReservationResult] = useState<any | null>(null);
  const [assetSiteId, setAssetSiteId] = useState('');
  const [assetProductId, setAssetProductId] = useState('');
  const [assetType, setAssetType] = useState('camera');
  const [assetName, setAssetName] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [noteText, setNoteText] = useState('');

  const projectQuery = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.getProject(projectId), enabled: Number.isFinite(projectId) });
  const productsQuery = useQuery({ queryKey: ['products', productSearch], queryFn: () => catalogApi.listProducts(productSearch) });
  const project = projectQuery.data?.project;

  async function refreshProject() {
    await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  const siteMutation = useMutation({ mutationFn: (payload: any) => projectsApi.addSite(projectId, payload), onSuccess: async () => { setSiteName(''); setSiteAddress(''); await refreshProject(); } });
  const statusMutation = useMutation({ mutationFn: (payload: any) => projectsApi.changeStatus(projectId, payload), onSuccess: refreshProject });
  const materialMutation = useMutation({
    mutationFn: (payload: any) => projectsApi.addMaterial(projectId, payload),
    onSuccess: async (response) => {
      setReservationResult(response.material);
      setMaterialProductId('');
      setMaterialQty(1);
      setMaterialNotes('');
      await refreshProject();
    },
  });
  const assetMutation = useMutation({
    mutationFn: (payload: any) => projectsApi.addInstalledAsset(projectId, payload),
    onSuccess: async () => {
      setAssetSiteId('');
      setAssetProductId('');
      setAssetName('');
      setSerialNo('');
      setIpAddress('');
      await refreshProject();
    },
  });
  const noteMutation = useMutation({ mutationFn: (payload: any) => projectsApi.addNote(projectId, payload), onSuccess: async () => { setNoteText(''); await refreshProject(); } });

  if (!id) return null;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>{project?.project_code ?? `Project ${id}`}</h1>
        </div>
        <div className="page-actions">
          <Link to="/projects">Back to projects</Link>
          <Button icon={<FileText size={18} />} onClick={() => { window.location.href = `/projects/${id}/summary`; }}>Summary</Button>
        </div>
      </header>

      <section className="panel entity-summary">
        <h2>{project?.title ?? 'Loading project...'}</h2>
        <p><strong>Status:</strong> {project?.status ?? '-'}</p>
        <p><strong>Description:</strong> {project?.description ?? '-'}</p>
      </section>

      <section className="detail-grid">
        <article className="panel entity-form">
          <h2>Sites / Locations</h2>
          <DataTable
            rows={project?.sites ?? []}
            getRowKey={(site) => site.id}
            emptyText="No sites"
            columns={[
              { key: 'name', header: 'Site', render: (site) => site.site_name },
              { key: 'address', header: 'Address', render: (site) => site.address_text ?? '-' },
              { key: 'contact', header: 'Contact', render: (site) => site.contact_name ?? '-' },
            ]}
          />
          <form className="entity-form" onSubmit={(event) => { event.preventDefault(); if (siteName.trim()) siteMutation.mutate({ siteName, addressText: siteAddress || null }); }}>
            <Input label="Site name" value={siteName} onChange={(event) => setSiteName(event.target.value)} required />
            <Textarea label="Address / location" value={siteAddress} onChange={(event) => setSiteAddress(event.target.value)} />
            <Button type="submit" isLoading={siteMutation.isPending}>Add Site</Button>
          </form>
        </article>

        <aside className="panel entity-form">
          <h2>Status</h2>
          <form className="entity-form" onSubmit={(event) => { event.preventDefault(); statusMutation.mutate({ status, stageCode: stageCode || null, notes: statusNotes || null }); }}>
            <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Input label="Stage code" value={stageCode} onChange={(event) => setStageCode(event.target.value)} />
            <Textarea label="Status notes" value={statusNotes} onChange={(event) => setStatusNotes(event.target.value)} />
            <Button type="submit" isLoading={statusMutation.isPending}>Change Status</Button>
          </form>
        </aside>
      </section>

      <section className="detail-grid">
        <article className="panel entity-form">
          <h2>Materials</h2>
          <DataTable
            rows={project?.materials ?? []}
            getRowKey={(material) => material.id}
            emptyText="No reserved materials"
            columns={[
              { key: 'product', header: 'Product', render: (material) => material.product_name_snapshot },
              { key: 'qty', header: 'Qty', render: (material) => material.quantity },
              { key: 'reservation', header: 'Reservation', render: (material) => material.reservation_id },
            ]}
          />
          {reservationResult ? (
            <div className="table-state">
              Reservation created: id {reservationResult.reservationId ?? reservationResult.reservation_id ?? 'n/a'}; material id {reservationResult.id ?? 'n/a'}
            </div>
          ) : null}
          <form className="entity-form" onSubmit={(event) => { event.preventDefault(); if (materialProductId) materialMutation.mutate({ productId: Number(materialProductId), quantity: materialQty, notes: materialNotes || null }); }}>
            <Input label="Product search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
            <Select label="Material product" value={materialProductId} onChange={(event) => setMaterialProductId(event.target.value)} required>
              <option value="">Select product</option>
              {(productsQuery.data?.items ?? []).map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.default_name}</option>)}
            </Select>
            <Input label="Quantity" type="number" min={0.0001} step={0.0001} value={materialQty} onChange={(event) => setMaterialQty(Number(event.target.value))} />
            <Textarea label="Reservation notes" value={materialNotes} onChange={(event) => setMaterialNotes(event.target.value)} />
            <Button type="submit" isLoading={materialMutation.isPending}>Reserve Material</Button>
          </form>
        </article>

        <aside className="panel entity-form">
          <h2>Installed Assets</h2>
          <DataTable
            rows={project?.installedAssets ?? []}
            getRowKey={(asset) => asset.id}
            emptyText="No installed assets"
            columns={[
              { key: 'type', header: 'Type', render: (asset) => asset.asset_type },
              { key: 'name', header: 'Name', render: (asset) => asset.asset_name },
              { key: 'ip', header: 'IP', render: (asset) => asset.ip_address ?? '-' },
            ]}
          />
          <form className="entity-form" onSubmit={(event) => { event.preventDefault(); if (assetName.trim()) assetMutation.mutate({ siteId: assetSiteId ? Number(assetSiteId) : null, productId: assetProductId ? Number(assetProductId) : null, assetType, assetName, serialNo: serialNo || null, ipAddress: ipAddress || null }); }}>
            <Select label="Site" value={assetSiteId} onChange={(event) => setAssetSiteId(event.target.value)}>
              <option value="">No site</option>
              {(project?.sites ?? []).map((site) => <option key={site.id} value={site.id}>{site.site_name}</option>)}
            </Select>
            <Select label="Product" value={assetProductId} onChange={(event) => setAssetProductId(event.target.value)}>
              <option value="">No product</option>
              {(productsQuery.data?.items ?? []).map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.default_name}</option>)}
            </Select>
            <Input label="Asset type" value={assetType} onChange={(event) => setAssetType(event.target.value)} required />
            <Input label="Asset name" value={assetName} onChange={(event) => setAssetName(event.target.value)} required />
            <Input label="Serial no" value={serialNo} onChange={(event) => setSerialNo(event.target.value)} />
            <Input label="IP address" value={ipAddress} onChange={(event) => setIpAddress(event.target.value)} />
            <Button type="submit" isLoading={assetMutation.isPending}>Add Asset</Button>
          </form>
        </aside>
      </section>

      <section className="detail-grid">
        <article className="panel entity-form">
          <h2>Notes</h2>
          <ul>{(project?.notes ?? []).map((note) => <li key={note.id}>{note.note_text}</li>)}</ul>
          <form className="entity-form" onSubmit={(event) => { event.preventDefault(); if (noteText.trim()) noteMutation.mutate({ noteText }); }}>
            <Textarea label="Project note" value={noteText} onChange={(event) => setNoteText(event.target.value)} />
            <Button type="submit" isLoading={noteMutation.isPending}>Add Note</Button>
          </form>
        </article>
        <aside className="panel entity-form">
          <h2>Status History</h2>
          <ul>{(project?.history ?? []).map((item) => <li key={item.id}>{item.from_status ?? '-'} - {item.to_status} ({item.stage_code ?? 'stage n/a'})</li>)}</ul>
        </aside>
      </section>
    </>
  );
}
