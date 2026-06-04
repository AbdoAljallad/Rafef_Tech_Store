import React, { useEffect, useState } from 'react';
import creativeApi from '../../modules/creative/api/creative.api';

export function VendorsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => { creativeApi.listVendors().then((r) => setItems(r.items ?? r)); }, []);

  async function create() {
    await creativeApi.createVendor({ code, name });
    const r = await creativeApi.listVendors();
    setItems(r.items ?? r);
    setCode(''); setName('');
  }

  return (
    <div>
      <h2>Vendors</h2>
      <div>
        <input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={create}>Create</button>
      </div>
      <ul>
        {items.map((v) => <li key={v.id}>{v.code} — {v.name}</li>)}
      </ul>
    </div>
  );
}

export default VendorsPage;
