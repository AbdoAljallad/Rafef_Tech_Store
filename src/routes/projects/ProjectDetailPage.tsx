import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { getAvailableQuantity, hasAvailableStock } from '../../modules/catalog/utils/stockAvailability';
import { projectsApi } from '../../modules/projects/api/projects.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

const statuses = ['draft', 'planned', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;

function formatProjectStatus(status: string | null | undefined, t: (key: string, options?: any) => string) {
  if (!status) {
    return '-';
  }

  return String(t(`projects.statusOptions.${status}`));
}

export function ProjectDetailPage() {
  const { t } = useTranslation('app');
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
  const [materialError, setMaterialError] = useState('');
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
  const products = productsQuery.data?.items ?? [];
  const selectedMaterialProduct = products.find((product) => String(product.id) === materialProductId) ?? null;

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
      setMaterialError('');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
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

  function validateMaterialReservation() {
    if (!materialProductId) {
      return t('repair.productRequired');
    }

    if (materialQty < 0.0001) {
      return t('repair.quantityMin');
    }

    if (!selectedMaterialProduct || !hasAvailableStock(selectedMaterialProduct)) {
      return t('sales.errors.outOfStock');
    }

    const available = getAvailableQuantity(selectedMaterialProduct);
    if (materialQty > available) {
      return t('sales.errors.quantityExceedsAvailable', { count: available });
    }

    return null;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('projects.module')}</p>
          <h1>{project?.project_code ?? t('projects.detailFallback', { id })}</h1>
        </div>
        <div className="page-actions">
          <Link to="/projects">{t('projects.backToProjects')}</Link>
          <Button icon={<FileText size={18} />} onClick={() => { window.location.href = `/projects/${id}/summary`; }}>
            {t('projects.summary')}
          </Button>
        </div>
      </header>

      <section className="panel entity-summary">
        <h2>{project?.title ?? t('projects.loadingProject')}</h2>
        <p><strong>{t('projects.status')}:</strong> {formatProjectStatus(project?.status, t)}</p>
        <p><strong>{t('projects.description')}:</strong> {project?.description ?? '-'}</p>
      </section>

      <section className="detail-grid">
        <article className="panel entity-form">
          <h2>{t('projects.siteLocations')}</h2>
          <DataTable
            rows={project?.sites ?? []}
            getRowKey={(site) => site.id}
            emptyText={t('projects.noSites')}
            columns={[
              { key: 'name', header: t('projects.site'), render: (site) => site.site_name },
              { key: 'address', header: t('projects.address'), render: (site) => site.address_text ?? '-' },
              { key: 'contact', header: t('projects.contact'), render: (site) => site.contact_name ?? '-' },
            ]}
          />
          <form className="entity-form" onSubmit={(event) => { event.preventDefault(); if (siteName.trim()) siteMutation.mutate({ siteName, addressText: siteAddress || null }); }}>
            <Input label={t('projects.siteName')} value={siteName} onChange={(event) => setSiteName(event.target.value)} required />
            <Textarea label={t('projects.addressLocation')} value={siteAddress} onChange={(event) => setSiteAddress(event.target.value)} />
            <Button type="submit" isLoading={siteMutation.isPending}>{t('projects.addSite')}</Button>
          </form>
        </article>

        <aside className="panel entity-form">
          <h2>{t('projects.status')}</h2>
          <form className="entity-form" onSubmit={(event) => { event.preventDefault(); statusMutation.mutate({ status, stageCode: stageCode || null, notes: statusNotes || null }); }}>
            <Select label={t('projects.status')} value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => <option key={item} value={item}>{t(`projects.statusOptions.${item}`)}</option>)}
            </Select>
            <Input label={t('projects.stageCode')} value={stageCode} onChange={(event) => setStageCode(event.target.value)} />
            <Textarea label={t('projects.statusNotes')} value={statusNotes} onChange={(event) => setStatusNotes(event.target.value)} />
            <Button type="submit" isLoading={statusMutation.isPending}>{t('projects.changeStatus')}</Button>
          </form>
        </aside>
      </section>

      <section className="detail-grid">
        <article className="panel entity-form">
          <h2>{t('projects.materials')}</h2>
          <DataTable
            rows={project?.materials ?? []}
            getRowKey={(material) => material.id}
            emptyText={t('projects.noReservedMaterials')}
            columns={[
              { key: 'product', header: t('projects.product'), render: (material) => material.product_name_snapshot },
              { key: 'qty', header: t('projects.qty'), render: (material) => material.quantity },
              { key: 'reservation', header: t('projects.reservation'), render: (material) => material.reservation_id },
            ]}
          />
          {reservationResult ? (
            <div className="table-state">
              {t('projects.reservationCreated', {
                reservationId: reservationResult.reservationId ?? reservationResult.reservation_id ?? 'n/a',
                materialId: reservationResult.id ?? 'n/a',
              })}
            </div>
          ) : null}
          {materialError ? <div className="table-state">{materialError}</div> : null}
          <form
            className="entity-form"
            onSubmit={(event) => {
              event.preventDefault();
              const validationMessage = validateMaterialReservation();
              if (validationMessage) {
                setMaterialError(validationMessage);
                return;
              }

              setMaterialError('');
              materialMutation.mutate({ productId: Number(materialProductId), quantity: materialQty, notes: materialNotes || null });
            }}
          >
            <Input label={t('projects.productSearch')} value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
            <Select label={t('projects.materialProduct')} value={materialProductId} onChange={(event) => setMaterialProductId(event.target.value)} required>
              <option value="">{t('repair.selectProduct')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id} disabled={!hasAvailableStock(product)}>
                  {product.sku} - {product.default_name} - {t('sales.fields.available')}: {getAvailableQuantity(product)}
                </option>
              ))}
            </Select>
            <Input label={t('projects.qty')} type="number" min={0.0001} step={0.0001} value={materialQty} onChange={(event) => setMaterialQty(Number(event.target.value))} />
            <Textarea label={t('projects.reservationNotes')} value={materialNotes} onChange={(event) => setMaterialNotes(event.target.value)} />
            <Button type="submit" isLoading={materialMutation.isPending} disabled={selectedMaterialProduct ? !hasAvailableStock(selectedMaterialProduct) : false}>{t('projects.reserveMaterial')}</Button>
          </form>
        </article>

        <aside className="panel entity-form">
          <h2>{t('projects.installedAssets')}</h2>
          <DataTable
            rows={project?.installedAssets ?? []}
            getRowKey={(asset) => asset.id}
            emptyText={t('projects.noInstalledAssets')}
            columns={[
              { key: 'type', header: t('projects.assetType'), render: (asset) => asset.asset_type },
              { key: 'name', header: t('projects.name'), render: (asset) => asset.asset_name },
              { key: 'ip', header: t('projects.ip'), render: (asset) => asset.ip_address ?? '-' },
            ]}
          />
          <form className="entity-form" onSubmit={(event) => { event.preventDefault(); if (assetName.trim()) assetMutation.mutate({ siteId: assetSiteId ? Number(assetSiteId) : null, productId: assetProductId ? Number(assetProductId) : null, assetType, assetName, serialNo: serialNo || null, ipAddress: ipAddress || null }); }}>
            <Select label={t('projects.site')} value={assetSiteId} onChange={(event) => setAssetSiteId(event.target.value)}>
              <option value="">{t('projects.siteOptionNone')}</option>
              {(project?.sites ?? []).map((site) => <option key={site.id} value={site.id}>{site.site_name}</option>)}
            </Select>
            <Select label={t('projects.product')} value={assetProductId} onChange={(event) => setAssetProductId(event.target.value)}>
              <option value="">{t('projects.productOptionNone')}</option>
              {(productsQuery.data?.items ?? []).map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.default_name}</option>)}
            </Select>
            <Input label={t('projects.assetType')} value={assetType} onChange={(event) => setAssetType(event.target.value)} required />
            <Input label={t('projects.assetName')} value={assetName} onChange={(event) => setAssetName(event.target.value)} required />
            <Input label={t('projects.serialNo')} value={serialNo} onChange={(event) => setSerialNo(event.target.value)} />
            <Input label={t('projects.ipAddress')} value={ipAddress} onChange={(event) => setIpAddress(event.target.value)} />
            <Button type="submit" isLoading={assetMutation.isPending}>{t('projects.addAsset')}</Button>
          </form>
        </aside>
      </section>

      <section className="detail-grid">
        <article className="panel entity-form">
          <h2>{t('projects.notes')}</h2>
          <ul>{(project?.notes ?? []).map((note) => <li key={note.id}>{note.note_text}</li>)}</ul>
          <form className="entity-form" onSubmit={(event) => { event.preventDefault(); if (noteText.trim()) noteMutation.mutate({ noteText }); }}>
            <Textarea label={t('projects.projectNote')} value={noteText} onChange={(event) => setNoteText(event.target.value)} />
            <Button type="submit" isLoading={noteMutation.isPending}>{t('projects.addNote')}</Button>
          </form>
        </article>
        <aside className="panel entity-form">
          <h2>{t('projects.statusHistory')}</h2>
          <ul>{(project?.history ?? []).map((item) => <li key={item.id}>{item.from_status ?? '-'} - {item.to_status} ({item.stage_code ?? '-'})</li>)}</ul>
        </aside>
      </section>
    </>
  );
}
