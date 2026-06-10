import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import creativeApi from '../../modules/creative/api/creative.api';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';

function formatCreativeStatus(status: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`creative.statuses.${status}`, { ns: 'app', defaultValue: status });
}

export function JobDetailPage() {
  const { t } = useTranslation(['app', 'common']);
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [lineDesc, setLineDesc] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [statusTo, setStatusTo] = useState('');

  useEffect(() => {
    creativeApi.listVendors().then((response) => setVendors(response.items ?? response));
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }

    creativeApi.getJob(Number(id)).then((response) => setJob(response.job));
  }, [id]);

  async function addLine() {
    if (!id) {
      return;
    }

    await creativeApi.addJobLine(Number(id), { description: lineDesc, quantity, unitPrice });
    const response = await creativeApi.getJob(Number(id));
    setJob(response.job);
    setLineDesc('');
    setQuantity(1);
    setUnitPrice(0);
  }

  async function createTask() {
    if (!id || !vendorId) {
      return;
    }

    await creativeApi.createVendorTask(Number(id), {
      vendorId,
      jobId: Number(id),
      externalTaskCode: null,
      notes: t('creative.detail.interfaceCreatedNote', { ns: 'app' }),
    });
    const response = await creativeApi.getJob(Number(id));
    setJob(response.job);
  }

  async function changeStatus() {
    if (!id) {
      return;
    }

    await creativeApi.changeJobStatus(Number(id), {
      toStatus: statusTo,
      notes: t('creative.detail.interfaceChangedNote', { ns: 'app' }),
    });
    const response = await creativeApi.getJob(Number(id));
    setJob(response.job);
    setStatusTo('');
  }

  if (!job) {
    return <section className="panel">{t('creative.detail.loading', { ns: 'app' })}</section>;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('creative.module', { ns: 'app' })}</p>
          <h1>{t('creative.detail.title', { ns: 'app', code: job.job_code })}</h1>
        </div>
      </header>

      <section className="detail-grid">
        <article className="panel">
          <div className="form-stack">
            <div>
              <strong>{t('creative.titleLabel', { ns: 'app' })}:</strong> {job.title}
            </div>
            <div>
              <strong>{t('creative.detail.descriptionLabel', { ns: 'app' })}:</strong> {job.description || t('empty', { ns: 'common' })}
            </div>
            <div>
              <strong>{t('creative.status', { ns: 'app' })}:</strong> {formatCreativeStatus(job.status, t)}
            </div>
          </div>
        </article>

        <article className="panel">
          <h2>{t('creative.detail.linesTitle', { ns: 'app' })}</h2>
          {(job.lines || []).length > 0 ? (
            <ul>
              {(job.lines || []).map((line: any) => (
                <li key={line.id}>
                  {line.description} - {line.quantity} x {line.unit_price}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('creative.detail.noLines', { ns: 'app' })}</p>
          )}

          <div className="form-stack">
            <Input label={t('creative.detail.lineDescription', { ns: 'app' })} value={lineDesc} onChange={(event) => setLineDesc(event.target.value)} />
            <Input
              label={t('creative.detail.quantity', { ns: 'app' })}
              type="number"
              value={String(quantity)}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
            <Input
              label={t('creative.detail.unitPrice', { ns: 'app' })}
              type="number"
              value={String(unitPrice)}
              onChange={(event) => setUnitPrice(Number(event.target.value))}
            />
            <Button onClick={() => void addLine()}>{t('creative.detail.addLine', { ns: 'app' })}</Button>
          </div>
        </article>

        <article className="panel">
          <h2>{t('creative.detail.vendorTasksTitle', { ns: 'app' })}</h2>
          {(job.vendorTasks || []).length > 0 ? (
            <ul>
              {(job.vendorTasks || []).map((task: any) => (
                <li key={task.id}>
                  {(task.external_task_code || t('empty', { ns: 'common' }))} - {(task.notes || t('empty', { ns: 'common' }))} - {formatCreativeStatus(task.status, t)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('creative.detail.noVendorTasks', { ns: 'app' })}</p>
          )}

          <div className="form-stack">
            <Select label={t('creative.detail.selectVendor', { ns: 'app' })} onChange={(event) => setVendorId(Number(event.target.value))} value={vendorId ?? ''}>
              <option value="">{t('creative.detail.selectVendor', { ns: 'app' })}</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
            <Button onClick={() => void createTask()}>{t('creative.detail.createVendorTask', { ns: 'app' })}</Button>
          </div>
        </article>

        <article className="panel">
          <h2>{t('creative.detail.statusHistoryTitle', { ns: 'app' })}</h2>
          {(job.history || []).length > 0 ? (
            <ul>
              {(job.history || []).map((history: any) => (
                <li key={history.id}>
                  {formatCreativeStatus(history.from_status || 'draft', t)} {'->'} {formatCreativeStatus(history.to_status, t)} - {history.notes || t('empty', { ns: 'common' })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('creative.detail.noHistory', { ns: 'app' })}</p>
          )}

          <div className="form-stack">
            <Input label={t('creative.detail.newStatus', { ns: 'app' })} value={statusTo} onChange={(event) => setStatusTo(event.target.value)} />
            <Button onClick={() => void changeStatus()}>{t('creative.detail.changeStatus', { ns: 'app' })}</Button>
          </div>
        </article>
      </section>
    </>
  );
}

export default JobDetailPage;
