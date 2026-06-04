import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../../modules/sales/api/sales.api';
import { Button } from '../../shared/ui/Button';

export function InvoiceDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const invoiceQuery = useQuery({ queryKey: ['salesInvoice', id], queryFn: () => salesApi.getInvoice(Number(id)) });
  const approveMutation = useMutation({ mutationFn: (id: number) => salesApi.approveInvoice(id), onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['salesInvoice', id] }) });
  const voidMutation = useMutation({ mutationFn: (payload: any) => salesApi.voidInvoice(Number(id), payload), onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['salesInvoice', id] }) });

  const invoice = invoiceQuery.data?.invoice;
  if (!id) return null;

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">Sales</p><h1>Invoice {invoice?.invoice_code ?? id}</h1></div></header>
      <section>
        <div><strong>Status:</strong> {invoice?.status}</div>
        <h3>Lines</h3>
        <ul>{(invoice?.lines ?? []).map((l: any) => <li key={l.id}>{l.product_id} × {l.quantity} @ {l.unit_price}</li>)}</ul>
        <div className="actions">
          {invoice?.status === 'draft' && <Button onClick={() => approveMutation.mutate(Number(id))}>Approve</Button>}
          {invoice?.status !== 'voided' && <Button onClick={() => { const reason = prompt('Reason for voiding'); if (reason !== null) voidMutation.mutate({ reason }); }}>Void</Button>}
          <Button onClick={() => { window.location.href = `/sales/invoices/${id}/receipt`; }}>View Receipt</Button>
        </div>
      </section>
    </div>
  );
}
