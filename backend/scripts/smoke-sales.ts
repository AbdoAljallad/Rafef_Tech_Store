import fetch from 'node-fetch';

const BASE = 'http://localhost:3000/api';

async function run() {
  console.log('Logging in...');
  const loginRes = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }), redirect: 'manual' });
  if (!loginRes.ok) throw new Error('Login failed: ' + loginRes.status);
  const cookies = loginRes.headers.get('set-cookie');
  console.log('Got cookie:', !!cookies);
  const cookieHeader = cookies ? cookies.split(';')[0] : '';

  console.log('Listing products...');
  const productsRes = await fetch(`${BASE}/products`, { headers: { cookie: cookieHeader } });
  const products = await productsRes.json().catch(() => ({ items: [] }));
  const product = (products.items && products.items[0]) || null;
  if (!product) {
    console.log('No product found; cannot run full sale flow. Test ended.');
    return;
  }
  console.log('Using product id', product.id, product.sku || product.default_name);

  console.log('Creating invoice draft...');
  const invRes = await fetch(`${BASE}/sales/invoices`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookieHeader }, body: JSON.stringify({ isWalkIn: true, lines: [{ productId: product.id, quantity: 1, unitPrice: 1.0 }] }) });
  const inv = await invRes.json();
  console.log('Create invoice response:', invRes.status, JSON.stringify(inv).slice(0, 200));
  const invoiceId = inv.invoice?.id;
  if (!invoiceId) { console.log('No invoice id returned'); return; }

  console.log('Approving invoice...', invoiceId);
  const approveRes = await fetch(`${BASE}/sales/invoices/${invoiceId}/approve`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookieHeader }, body: JSON.stringify({ approve: true }) });
  console.log('Approve status', approveRes.status, await approveRes.text());

  console.log('Creating return for invoice...');
  const retRes = await fetch(`${BASE}/sales/returns`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookieHeader }, body: JSON.stringify({ invoiceId, lines: [{ productId: product.id, quantity: 1 }] }) });
  console.log('Return status', retRes.status, await retRes.text());
}

run().catch((e) => { console.error('Smoke test failed', e); process.exit(1); });
