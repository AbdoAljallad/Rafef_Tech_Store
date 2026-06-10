import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../../modules/sales/api/sales.api';
import { Button } from '../../shared/ui/Button';

export function InvoiceDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const invoiceQuery = useQuery({ queryKey: ['salesInvoice', id], queryFn: () => salesApi.getInvoice(Number(id)) });
  const approveMutation = useMutation({ mutationFn: (invoiceId: number) => salesApi.approveInvoice(invoiceId), onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['salesInvoice', id] }) });
  const voidMutation = useMutation({ mutationFn: (payload: any) => salesApi.voidInvoice(Number(id), payload), onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['salesInvoice', id] }) });

  const invoice = invoiceQuery.data?.invoice;
  if (!id) return null;

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">Продажи</p><h1>Счёт {invoice?.invoice_code ?? id}</h1></div></header>
      <section>
        <div><strong>Статус:</strong> {invoice?.status}</div>
        <h3>Позиции</h3>
        <ul>{(invoice?.lines ?? []).map((line: any) => <li key={line.id}>{line.product_id} × {line.quantity} @ {line.unit_price}</li>)}</ul>
        <div className="actions">
          {invoice?.status === 'draft' && <Button onClick={() => approveMutation.mutate(Number(id))}>Провести</Button>}
          {invoice?.status !== 'voided' && <Button onClick={() => { const reason = prompt('Причина аннулирования'); if (reason !== null) voidMutation.mutate({ reason }); }}>Аннулировать</Button>}
          <Button onClick={() => { window.location.href = `/sales/invoices/${id}/receipt`; }}>Открыть чек</Button>
        </div>
      </section>
    </div>
  );
}
