import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { repairApi } from '../../modules/repair/api/repair.api';
import { crmApi } from '../../modules/crm/api/crm.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Button } from '../../shared/ui/Button';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { useForm } from 'react-hook-form';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';

export function OrdersPage() {
  const { t } = useTranslation('app');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const ordersQuery = useQuery({ queryKey: ['repairOrders'], queryFn: () => repairApi.listOrders({ offset: 0, limit: 50 }) });
  const createMutation = useMutation({ mutationFn: repairApi.createOrder, onSuccess: async () => { setIsCreateOpen(false); await queryClient.invalidateQueries({ queryKey: ['repairOrders'] }); } });
  const form = useForm({ defaultValues: { customerId: '', deviceId: '', problemDescription: '', intakeNotes: '' } });
  const [customerSearch, setCustomerSearch] = useState('');
  const customersQuery = useQuery({ queryKey: ['customers', customerSearch], queryFn: () => crmApi.listCustomers(customerSearch) });

  async function handleCreate(values: any) {
    if (!values.customerId) return alert(t('repair.customerRequired'));
    await createMutation.mutateAsync({
      customerId: Number(values.customerId),
      deviceId: values.deviceId ? Number(values.deviceId) : undefined,
      problemDescription: values.problemDescription,
      intakeNotes: values.intakeNotes,
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('repair.module')}</p>
          <h1>{t('repair.ordersTitle')}</h1>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
          {t('repair.newRepair')}
        </Button>
      </header>
      <section className="page-toolbar" />
      <DataTable
        rows={ordersQuery.data?.items ?? []}
        isLoading={ordersQuery.isLoading}
        emptyText={ordersQuery.isError ? t('repair.loadFailed') : t('repair.noOrders')}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/repair/orders/${row.id}`)}
        columns={[
          { key: 'code', header: t('repair.code'), render: (row) => row.order_code },
          { key: 'customer', header: t('repair.customer'), render: (row) => row.customer_name ?? row.customer_id },
          { key: 'device', header: t('repair.device'), render: (row) => row.device_name ?? row.device_id },
          { key: 'status', header: t('repair.status'), render: (row) => row.status },
        ]}
      />

      <FormDrawer title={t('repair.createRepair')} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form onSubmit={form.handleSubmit(handleCreate)} className="stack">
          <label>
            {t('repair.customerField')}
            <SearchInput placeholder={t('repair.searchCustomers')} value={customerSearch} onChange={(e) => setCustomerSearch((e.target as HTMLInputElement).value)} />
          </label>
          <label>
            {t('repair.selectCustomer')}
            <select {...form.register('customerId')} defaultValue="">
              <option value="">{t('repair.selectCustomerPlaceholder')}</option>
              {(customersQuery.data?.items ?? []).map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_code} — {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('repair.deviceId')}
            <input {...form.register('deviceId')} placeholder={t('repair.deviceIdPlaceholder')} />
          </label>
          <label>
            {t('repair.problemDescription')}
            <textarea {...form.register('problemDescription')} />
          </label>
          <label>
            {t('repair.intakeNotes')}
            <textarea {...form.register('intakeNotes')} />
          </label>
          <div className="actions">
            <Button type="submit">{t('repair.create')}</Button>
          </div>
        </form>
      </FormDrawer>
    </>
  );
}
