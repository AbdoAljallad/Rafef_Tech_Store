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
    const response = await creativeApi.getJob(Number(id));
    setJob(response.job);
    setLineDesc('');
    setQuantity(1);
    setUnitPrice(0);
  }

  async function createTask() {
    if (!id || !vendorId) return;
    await creativeApi.createVendorTask(Number(id), { vendorId, jobId: Number(id), externalTaskCode: null, notes: 'Создано из интерфейса' });
    const response = await creativeApi.getJob(Number(id));
    setJob(response.job);
  }

  async function changeStatus() {
    if (!id) return;
    await creativeApi.changeJobStatus(Number(id), { toStatus: statusTo, notes: 'Изменено из интерфейса' });
    const response = await creativeApi.getJob(Number(id));
    setJob(response.job);
    setStatusTo('');
  }

  if (!job) return <div>Загрузка...</div>;

  return (
    <div>
      <h2>Работа {job.job_code}</h2>
      <div>Название: {job.title}</div>
      <div>Описание: {job.description}</div>
      <div>Статус: {job.status}</div>

      <h3>Позиции</h3>
      <ul>{(job.lines || []).map((line: any) => <li key={line.id}>{line.description} — {line.quantity} × {line.unit_price}</li>)}</ul>
      <div>
        <input placeholder="Описание" value={lineDesc} onChange={(e) => setLineDesc(e.target.value)} />
        <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
        <button onClick={addLine}>Добавить позицию</button>
      </div>

      <h3>Задачи исполнителям</h3>
      <ul>{(job.vendorTasks || []).map((task: any) => <li key={task.id}>{task.external_task_code} — {task.notes} — {task.status}</li>)}</ul>
      <div>
        <select onChange={(e) => setVendorId(Number(e.target.value))} value={vendorId ?? ''}>
          <option value="">Выберите исполнителя</option>
          {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
        </select>
        <button onClick={createTask}>Создать задачу исполнителю</button>
      </div>

      <h3>История статусов</h3>
      <ul>{(job.history || []).map((history: any) => <li key={history.id}>{history.from_status} → {history.to_status} — {history.notes} ({history.created_at})</li>)}</ul>
      <div>
        <input placeholder="Новый статус" value={statusTo} onChange={(e) => setStatusTo(e.target.value)} />
        <button onClick={changeStatus}>Изменить статус</button>
      </div>
    </div>
  );
}

export default JobDetailPage;
