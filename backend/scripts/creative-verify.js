(async ()=>{
  const fetch = globalThis.fetch;
  const base = 'http://localhost:3000/api';
  const out = (label, v) => console.log(label, JSON.stringify(v, null, 2).slice(0,1000));

  const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }), redirect: 'manual' });
  if (!login.ok) { console.error('login failed', await login.text()); process.exit(1); }
  const tokenRes = await login.json();
  const cookies = login.headers.get('set-cookie');
  const cookieHeader = cookies ? cookies.split(';')[0] : '';
  const headers = { 'content-type': 'application/json', cookie: cookieHeader };

  // Verify migration: try simple query via GET job-types (table must exist)
  const listJT = await fetch(base + '/creative/job-types', { headers });
  out('jobTypesListStatus', { status: listJT.status });
  const jtItems = await listJT.json().catch(()=>({items:[] }));
  out('jobTypes', jtItems);

  // Create job type
  const createJT = await fetch(base + '/creative/job-types', { method: 'POST', headers, body: JSON.stringify({ code: 'VER-PRINT', defaultName: 'Verification Print' }) });
  out('createdJobType', await createJT.json());

  // Create vendor
  const createV = await fetch(base + '/creative/vendors', { method: 'POST', headers, body: JSON.stringify({ code: 'VER-VEND', name: 'Ver Vendor' }) });
  out('createdVendor', await createV.json());

  // Create job
  const createJob = await fetch(base + '/creative/jobs', { method: 'POST', headers, body: JSON.stringify({ title: 'Verify Job', description: 'Verification' }) });
  const jobRes = await createJob.json();
  out('createdJob', jobRes);
  const jobId = jobRes.job?.id;

  if(!jobId){ console.error('no job id created'); process.exit(1); }

  // Add job line
  const addLine = await fetch(base + `/creative/jobs/${jobId}/lines`, { method: 'POST', headers, body: JSON.stringify({ lineType: 'print', description: 'A4', quantity: 2, unitPrice: 10 }) });
  out('addLine', await addLine.json());

  // Create vendor task
  const vendorList = await fetch(base + '/creative/vendors', { headers });
  const vendorItems = await vendorList.json();
  const vendorId = (vendorItems[0] && vendorItems[0].id) || (vendorItems.vendor && vendorItems.vendor.id) || null;
  // If vendorId null, try created vendor id from createV
  if(!vendorId){ try{ const created = await createV.json(); vendorId = created.vendor?.id; }catch(e){} }
  if(!vendorId){ console.error('no vendor id'); }
  const createTask = await fetch(base + `/creative/jobs/${jobId}/vendor-tasks`, { method: 'POST', headers, body: JSON.stringify({ vendorId: vendorId, jobId, externalTaskCode: 'EXT-1', notes: 'send to vendor' }) });
  out('createdTask', await createTask.json());

  // Change job status
  const change = await fetch(base + `/creative/jobs/${jobId}/status`, { method: 'POST', headers, body: JSON.stringify({ toStatus: 'in_progress', notes: 'started' }) });
  out('changeStatus', await change.json());

  // Fetch job and verify history and tasks
  const getJob = await fetch(base + `/creative/jobs/${jobId}`, { headers });
  const jobFull = await getJob.json();
  out('jobFull', jobFull);

  // Check audit table existence via direct endpoint if available
  try{
    const auditRes = await fetch(base + '/audit/events', { headers });
    if(auditRes.ok){ out('auditEvents', await auditRes.json()); } else { console.log('audit endpoint not present', auditRes.status); }
  }catch(e){ console.log('audit endpoint check failed'); }

  console.log('VERIFICATION_DONE');
})();
