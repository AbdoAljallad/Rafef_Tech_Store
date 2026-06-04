import { useState, useMemo } from 'react';
import type { DataTableColumn } from '../../shared/components/DataTable/DataTable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { salesApi } from '../../modules/sales/api/sales.api';
import { crmApi } from '../../modules/crm/api/crm.api';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Button } from '../../shared/ui/Button';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Checkbox } from '../../shared/ui/Checkbox';
import type { Product } from '../../modules/catalog/types/catalog.types';

export function PosPage() {
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<Array<any>>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const customersQuery = useQuery({ queryKey: ['customers', customerSearch], queryFn: () => crmApi.listCustomers(customerSearch) });
  const productsQuery = useQuery({ queryKey: ['products', search], queryFn: () => catalogApi.listProducts(search) });
  const queryClient = useQueryClient();
  const createInvoice = useMutation({ mutationFn: (payload: any) => salesApi.createInvoice(payload), onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] }) });
  const approveInvoice = useMutation({ mutationFn: (id: number) => salesApi.approveInvoice(id), onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] }) });

  function addProductToCart(product: any) {
    setCart((c) => {
      const found = c.find((x) => x.product.id === product.id);
      if (found) return c.map((x) => x.product.id === product.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { product, qty: 1 }];
    });
  }

  async function handleBarcodeLookup() {
    setErrorMessage(null);
    if (!barcode) return setErrorMessage('Enter a barcode');
    try {
      const res = await catalogApi.lookupBarcode(barcode);
      addProductToCart(res.product);
      setBarcode('');
    } catch (e: any) {
      setErrorMessage('Product not found for barcode');
    }
  }

  function changeQty(index: number, qty: number) { setCart((c) => c.map((it, i) => i === index ? { ...it, qty } : it)); }
  function removeItem(index: number) { setCart((c) => c.filter((_, i) => i !== index)); }
  function clearCart() { setCart([]); setErrorMessage(null); }

  const form = useForm({ defaultValues: { customerId: '', isWalkIn: true } });

  async function handleCreateInvoice(values: any) {
    setErrorMessage(null);
    if (cart.length === 0) return setErrorMessage('Cart is empty');
    const lines = cart.map((it) => ({ productId: it.product.id, quantity: it.qty, unitPrice: Number(it.product.current_sale_price ?? it.product.currentSalePrice ?? 1) }));
    const payload = { customerId: values.isWalkIn ? null : (values.customerId ? Number(values.customerId) : null), isWalkIn: values.isWalkIn, lines };
    let created;
    try {
      created = await createInvoice.mutateAsync(payload);
    } catch (e: any) {
      setErrorMessage(e?.message ?? 'Failed to create invoice');
      return;
    }
    const invoiceId = created.invoice?.id;
    if (invoiceId) {
      // try to auto-approve; if approval fails due to stock, show error and leave draft
      try {
        await approveInvoice.mutateAsync(invoiceId);
        // show created invoice and link to receipt
        setCreatedInvoice({ id: invoiceId });
        // navigate to invoice detail
        window.location.href = `/sales/invoices/${invoiceId}`;
      } catch (e: any) {
        // if backend indicates insufficient stock, show error and navigate to invoice detail for manual handling
        const body = e?.response ?? e;
        const message = e?.message ?? 'Approval failed';
        setErrorMessage(message);
        setCreatedInvoice({ id: invoiceId });
        window.location.href = `/sales/invoices/${invoiceId}`;
      }
    }
  }
  const subtotal = useMemo(() => cart.reduce((s, it) => s + (it.qty * Number(it.product.current_sale_price ?? it.product.currentSalePrice ?? 0)), 0), [cart]);
  const fmt = (v: number) => `${v.toFixed(2)} EGP`;
  const showStock = useMemo(() => (productsQuery.data?.items ?? []).some((p: any) => typeof p.quantity_on_hand !== 'undefined' || typeof p.qty_on_hand !== 'undefined'), [productsQuery.data]);
  const productColumns = useMemo<DataTableColumn<Product>[]>(() => {
    const columns: DataTableColumn<Product>[] = [
      { key: 'name', header: 'Товар', render: (r) => r.default_name },
      { key: 'sku', header: 'Артикул', render: (r) => r.sku },
      { key: 'price', header: 'Цена', render: (r) => fmt(Number(r.current_sale_price ?? 0)) },
    ];

    if (showStock) {
      columns.push({
        key: 'stock',
        header: 'На складе',
        render: (r) => {
          const stockProduct = r as Product & { quantity_on_hand?: string | number; qty_on_hand?: string | number };
          return String(stockProduct.quantity_on_hand ?? stockProduct.qty_on_hand ?? '—');
        },
      });
    }

    return columns;
  }, [showStock]);

  return (
    <div>
      <header className="page-header"><div><h1>КАССА</h1></div></header>
      <section className="pos-grid">
        <aside className="pos-left">
          <SearchInput placeholder="Поиск товара (SKU или название)" value={search} onChange={(e) => setSearch((e.target as HTMLInputElement).value)} />
          <div style={{ marginTop: 8 }}>
            <DataTable
              rows={productsQuery.data?.items ?? []}
              isLoading={productsQuery.isLoading}
              getRowKey={(r) => r.id}
              emptyText="Товаров нет"
              columns={productColumns}
              onRowClick={(r) => addProductToCart(r)}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <Input label="Штрихкод" value={barcode} onChange={(e) => setBarcode((e.target as HTMLInputElement).value)} />
            <Button onClick={handleBarcodeLookup}>Найти</Button>
          </div>
        </aside>

        <main className="pos-center">
          <h2>Корзина</h2>
          {errorMessage && <div className="notice error" role="alert">{errorMessage}</div>}
          <table className="cart-table">
            <thead>
              <tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th></th></tr>
            </thead>
            <tbody>
              {cart.map((it, i) => (
                <tr key={i}>
                  <td>{it.product.default_name}<div className="muted">{it.product.sku}</div></td>
                  <td><Input type="number" value={String(it.qty)} min={1} onChange={(e) => changeQty(i, Number((e.target as HTMLInputElement).value))} /></td>
                  <td>{fmt(Number(it.product.current_sale_price ?? it.product.currentSalePrice ?? 0))}</td>
                  <td>{fmt(it.qty * Number(it.product.current_sale_price ?? it.product.currentSalePrice ?? 0))}</td>
                  <td><Button onClick={() => removeItem(i)}>Удалить</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>

        <aside className="pos-right">
          <div className="customer-box">
            <Checkbox {...form.register('isWalkIn')} label="Покупатель без регистрации" />
            {!form.watch('isWalkIn') && (
              <div>
                <SearchInput placeholder="Поиск клиента" value={customerSearch} onChange={(e) => setCustomerSearch((e.target as HTMLInputElement).value)} />
                <Select {...form.register('customerId')} label="Выберите клиента">
                  <option value="">-- выберите --</option>
                  {(customersQuery.data?.items ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            )}
          </div>

          <div className="totals" style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6, background: '#fff' }}>
            <div className="total-line"><strong>Итого:</strong><div className="total-amount">{fmt(subtotal)}</div></div>
            <div className="actions-vertical">
              <Button onClick={clearCart}>Очистить корзину</Button>
              <Button onClick={() => handleCreateInvoice(form.getValues())}>Создать и провести</Button>
              {createdInvoice && <a className="receipt-link" href={`/sales/invoices/${createdInvoice.id}/receipt`}>Печать чека</a>}
            </div>
          </div>
        </aside>
      </section>
      <style>{`
        .pos-grid{display:grid;grid-template-columns:1fr 1fr 320px;gap:12px}
        .pos-left{padding:8px}
        .pos-center{padding:8px}
        .pos-right{padding:8px}
        .cart-table{width:100%;border-collapse:collapse}
        .cart-table th,.cart-table td{padding:6px;border-bottom:1px solid #eee}
        .total-line{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        .total-amount{font-size:1.6rem;color:#111}
        .actions-vertical > *{display:block;margin-bottom:8px}
        .muted{font-size:0.85rem;color:#666}
      `}</style>
    </div>
  );
}
