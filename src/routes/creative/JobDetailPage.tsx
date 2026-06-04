import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import creativeApi from '../../modules/creative/api/creative.api';

export function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [lineDesc, setLineDesc] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [statusTo, setStatusTo] = useState('');

  useEffect(() => { creativeApi.listVendors().then((r) => setVendors(r.items ?? r)); }, []);
  useEffect(() => { if (id) creativeApi.getJob(Number(id)).then((r) => setJob(r.job)); }, [id]);

  async function addLine() {
    if (!id) return;
    await creativeApi.addJobLine(Number(id), { description: lineDesc, quantity, unitPrice });
    const r = await creativeApi.getJob(Number(id)); setJob(r.job);
    setLineDesc(''); setQuantity(1); setUnitPrice(0);
  }

  async function createTask() {
    if (!id || !vendorId) return;
    await creativeApi.createVendorTask(Number(id), { vendorId, jobId: Number(id), externalTaskCode: null, notes: 'Created from UI' });
    const r = await creativeApi.getJob(Number(id)); setJob(r.job);
  }

  async function changeStatus() {
    if (!id) return;
    await creativeApi.changeJobStatus(Number(id), { toStatus: statusTo, notes: 'Changed from UI' });
    const r = await creativeApi.getJob(Number(id)); setJob(r.job);
    setStatusTo('');
  }

  if (!job) return <div>Loading...</div>;

  return (
    <div>
      <h2>Job {job.job_code}</h2>
      <div>Title: {job.title}</div>
      <div>Description: {job.description}</div>
      <div>Status: {job.status}</div>

      <h3>Lines</h3>
      <ul>{(job.lines||[]).map((l:any)=> <li key={l.id}>{l.description} — {l.quantity} × {l.unit_price}</li>)}</ul>
      <div>
        <input placeholder="Description" value={lineDesc} onChange={(e)=>setLineDesc(e.target.value)} />
        <input type="number" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} />
        <input type="number" value={unitPrice} onChange={(e)=>setUnitPrice(Number(e.target.value))} />
        <button onClick={addLine}>Add Line</button>
      </div>

      <h3>Vendor Tasks</h3>
      <ul>{(job.vendorTasks||[]).map((t:any)=> <li key={t.id}>{t.external_task_code} — {t.notes} — {t.status}</li>)}</ul>
      <div>
        <select onChange={(e)=>setVendorId(Number(e.target.value))} value={vendorId ?? ''}>
          <option value=''>Select vendor</option>
          {vendors.map(v=> <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <button onClick={createTask}>Create Vendor Task</button>
      </div>

      <h3>Status History</h3>
      <ul>{(job.history||[]).map((h:any)=> <li key={h.id}>{h.from_status} → {h.to_status} — {h.notes} ({h.created_at})</li>)}</ul>
      <div>
        <input placeholder="toStatus" value={statusTo} onChange={(e)=>setStatusTo(e.target.value)} />
        <button onClick={changeStatus}>Change Status</button>
      </div>
    </div>
  );
}

export default JobDetailPage;
