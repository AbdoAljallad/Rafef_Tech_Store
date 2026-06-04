(async ()=>{
  const fetch = globalThis.fetch;
  const base = 'http://localhost:3000/api';
  const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
  if (!login.ok) { console.error('login failed', await login.text()); process.exit(1); }
  const cookies = login.headers.get('set-cookie');
  const cookieHeader = cookies ? cookies.split(';')[0] : '';
  const headers = { 'content-type': 'application/json', cookie: cookieHeader };

  const createdV = await (await fetch(base + '/creative/vendors', { method: 'POST', headers, body: JSON.stringify({ code: 'TASK-VEND', name: 'Task Vendor' }) })).json();
  console.log('createdV', createdV);
  const vendorId = createdV.vendor?.id;
  if (!vendorId) { console.error('no vendor id'); process.exit(1); }

  const createdJob = await (await fetch(base + '/creative/jobs', { method: 'POST', headers, body: JSON.stringify({ title: 'Task Job' }) })).json();
  console.log('createdJob', createdJob);
  const jobId = createdJob.job?.id;
  if (!jobId) { console.error('no job id'); process.exit(1); }

  const createTask = await (await fetch(`${base}/creative/jobs/${jobId}/vendor-tasks`, { method: 'POST', headers, body: JSON.stringify({ vendorId, jobId, externalTaskCode: 'EXT-T1', notes: 'verify task' }) })).json();
  console.log('createTask', createTask);

  const jobFull = await (await fetch(`${base}/creative/jobs/${jobId}`, { headers })).json();
  console.log('jobFull.vendorTasks', JSON.stringify(jobFull.job.vendorTasks, null, 2));
})();
