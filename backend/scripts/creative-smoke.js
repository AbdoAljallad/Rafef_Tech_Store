(async ()=>{
  const base = 'http://localhost:3000/api';
  const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
  const tokenRes = await login.json();
  const cookies = login.headers.get('set-cookie');
  const cookieHeader = cookies ? cookies.split(';')[0] : '';
  console.log('login', !!cookieHeader, tokenRes?.accessToken ? 'accessToken' : 'no-token');
  const headers = { 'content-type': 'application/json', cookie: cookieHeader };

  const jt = await fetch(base + '/creative/job-types', { method: 'POST', headers, body: JSON.stringify({ code: 'PRINT', defaultName: 'Print' }) });
  console.log('create job type', await jt.json());

  const v = await fetch(base + '/creative/vendors', { method: 'POST', headers, body: JSON.stringify({ code: 'VEND-1', name: 'Vendor 1' }) });
  console.log('create vendor', await v.json());

  const j = await fetch(base + '/creative/jobs', { method: 'POST', headers, body: JSON.stringify({ title: 'Test Job', description: 'desc' }) });
  const jobRes = await j.json();
  console.log('create job', jobRes);
  const jobId = jobRes.job?.id;
  if (jobId) {
    const line = await fetch(`${base}/creative/jobs/${jobId}/lines`, { method: 'POST', headers, body: JSON.stringify({ lineType: 'print', description: 'A4', quantity: 10, unitPrice: 5 }) });
    console.log('add line', await line.json());
    const status = await fetch(`${base}/creative/jobs/${jobId}/status`, { method: 'POST', headers, body: JSON.stringify({ toStatus: 'started', notes: 'kickoff' }) });
    console.log('change status', await status.json());
  }
})();
