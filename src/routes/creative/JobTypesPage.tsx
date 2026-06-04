import React, { useEffect, useState } from 'react';
import creativeApi from '../../modules/creative/api/creative.api';

export function JobTypesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => { creativeApi.listJobTypes().then((r) => setItems(r.items ?? r)); }, []);

  async function create() {
    await creativeApi.createJobType({ code, defaultName: name });
    const r = await creativeApi.listJobTypes();
    setItems(r.items ?? r);
    setCode(''); setName('');
  }

  return (
    <div>
      <h2>Creative Job Types</h2>
      <div>
        <input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <input placeholder="Default Name" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={create}>Create</button>
      </div>
      <ul>
        {items.map((t) => <li key={t.id}>{t.code} — {t.default_name || t.defaultName}</li>)}
      </ul>
    </div>
  );
}

export default JobTypesPage;
