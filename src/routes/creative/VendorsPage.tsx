import React, { useEffect, useState } from 'react';
import creativeApi from '../../modules/creative/api/creative.api';

export function VendorsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    creativeApi.listVendors().then((r) => setItems(r.items ?? r));
  }, []);

  async function create() {
    await creativeApi.createVendor({ code, name });
    const response = await creativeApi.listVendors();
    setItems(response.items ?? response);
    setCode('');
    setName('');
  }

  return (
    <div>
      <h2>Исполнители</h2>
      <div>
        <input placeholder="Код" value={code} onChange={(e) => setCode(e.target.value)} />
        <input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={create}>Создать</button>
      </div>
      <ul>
        {items.map((vendor) => <li key={vendor.id}>{vendor.code} — {vendor.name}</li>)}
      </ul>
    </div>
  );
}

export default VendorsPage;
