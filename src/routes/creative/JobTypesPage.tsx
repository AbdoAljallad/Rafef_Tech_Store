import React, { useEffect, useState } from 'react';
import creativeApi from '../../modules/creative/api/creative.api';

export function JobTypesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    creativeApi.listJobTypes().then((r) => setItems(r.items ?? r));
  }, []);

  async function create() {
    await creativeApi.createJobType({ code, defaultName: name });
    const response = await creativeApi.listJobTypes();
    setItems(response.items ?? response);
    setCode('');
    setName('');
  }

  return (
    <div>
      <h2>Типы креативных работ</h2>
      <div>
        <input placeholder="Код" value={code} onChange={(e) => setCode(e.target.value)} />
        <input placeholder="Название по умолчанию" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={create}>Создать</button>
      </div>
      <ul>
        {items.map((type) => <li key={type.id}>{type.code} — {type.default_name || type.defaultName}</li>)}
      </ul>
    </div>
  );
}

export default JobTypesPage;
