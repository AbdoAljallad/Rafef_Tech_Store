import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repairApi } from '../../modules/repair/api/repair.api';
import { crmApi } from '../../modules/crm/api/crm.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { useForm } from 'react-hook-form';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';

export function OrdersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const ordersQuery = useQuery({ queryKey: ['repairOrders'], queryFn: () => repairApi.listOrders({ offset: 0, limit: 50 }) });
  const createMutation = useMutation({ mutationFn: repairApi.createOrder, onSuccess: async () => { setIsCreateOpen(false); await queryClient.invalidateQueries({ queryKey: ['repairOrders'] }); } });
  const form = useForm({ defaultValues: { customerId: '', deviceId: '', problemDescription: '', intakeNotes: '' } });
  const [customerSearch, setCustomerSearch] = useState('');
  const customersQuery = useQuery({ queryKey: ['customers', customerSearch], queryFn: () => crmApi.listCustomers(customerSearch) });

  async function handleCreate(values: any) {
    if (!values.customerId) return alert('Please select a customer');
    await createMutation.mutateAsync({ customerId: Number(values.customerId), deviceId: values.deviceId ? Number(values.deviceId) : undefined, problemDescription: values.problemDescription, intakeNotes: values.intakeNotes });
  }

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">Repair</p><h1>Repair Orders</h1></div>
        <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>New Repair</Button>
      </header>
      <section className="page-toolbar">
      </section>
      <DataTable
        rows={ordersQuery.data?.items ?? []}
        isLoading={ordersQuery.isLoading}
        emptyText={ordersQuery.isError ? 'Failed to load repair orders' : 'No repair orders'}
        getRowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/repair/orders/${r.id}`)}
        columns={[
          { key: 'code', header: 'Code', render: (r) => r.order_code },
          { key: 'customer', header: 'Customer', render: (r) => r.customer_name ?? r.customer_id },
          { key: 'device', header: 'Device', render: (r) => r.device_name ?? r.device_id },
          { key: 'status', header: 'Status', render: (r) => r.status },
        ]}
      />

      <FormDrawer title="Create Repair" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form onSubmit={form.handleSubmit(handleCreate)} className="stack">
          <label>Customer<SearchInput placeholder="Search customers" value={customerSearch} onChange={(e) => setCustomerSearch((e.target as HTMLInputElement).value)} /></label>
          <label>
            Select customer
            <select {...form.register('customerId')} defaultValue="">
              <option value="">-- select customer --</option>
              {(customersQuery.data?.items ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.customer_code} — {c.name}</option>)}
            </select>
          </label>
          <label>Device ID<input {...form.register('deviceId')} placeholder="optional device id (create under Devices)" /></label>
          <label>Problem Description<textarea {...form.register('problemDescription')} /></label>
          <label>Intake Notes<textarea {...form.register('intakeNotes')} /></label>
          <div className="actions"><Button type="submit">Create</Button></div>
        </form>
      </FormDrawer>
    </>
  );
}
