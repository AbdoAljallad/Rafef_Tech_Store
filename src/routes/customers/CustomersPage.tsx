import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../../modules/crm/api/crm.api';
import { CustomerForm } from '../../modules/crm/components/CustomerForm';
import type { CustomerFormValues } from '../../modules/crm/validators/customer.schemas';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const customersQuery = useQuery({
    queryKey: ['customers', search],
    queryFn: () => crmApi.listCustomers(search),
  });
  const createMutation = useMutation({
    mutationFn: crmApi.createCustomer,
    onSuccess: async () => {
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  async function handleCreate(values: CustomerFormValues) {
    await createMutation.mutateAsync(values);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>Клиенты</h1>
        </div>
        <PermissionGate permission="crm.customers.create">
          <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
            Новый клиент
          </Button>
        </PermissionGate>
      </header>

      <section className="page-toolbar">
        <SearchInput placeholder="Поиск по имени, телефону или коду" value={search} onChange={(event) => setSearch(event.target.value)} />
      </section>

      <DataTable
        rows={customersQuery.data?.items ?? []}
        isLoading={customersQuery.isLoading}
        emptyText={customersQuery.isError ? 'Не удалось загрузить клиентов' : 'Клиенты не найдены'}
        getRowKey={(customer) => customer.id}
        onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
        columns={[
          { key: 'code', header: 'Код', render: (customer) => customer.customer_code },
          { key: 'name', header: 'Имя', render: (customer) => customer.name },
          { key: 'phone', header: 'Телефон', render: (customer) => customer.phone_primary || '-' },
          { key: 'type', header: 'Тип', render: (customer) => (customer.customer_type === 'business' ? 'Компания' : 'Физ. лицо') },
        ]}
      />

      <FormDrawer title="Новый клиент" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <CustomerForm onSubmit={handleCreate} isSubmitting={createMutation.isPending} />
      </FormDrawer>
    </>
  );
}
