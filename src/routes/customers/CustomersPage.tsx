import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Building2, Hash, Mail, Phone, Plus, SearchX, UserRound, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../../modules/crm/api/crm.api';
import { CustomerForm } from '../../modules/crm/components/CustomerForm';
import type { Customer } from '../../modules/crm/types/crm.types';
import type { CustomerFormValues } from '../../modules/crm/validators/customer.schemas';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { PermissionGate } from '../../shared/permissions/PermissionGate';

function getCustomerTypeLabel(customer: Customer) {
  return customer.customer_type === 'business' ? 'Компания' : 'Физ. лицо';
}

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

  const customers = customersQuery.data?.items ?? [];
  const hasSearch = search.trim().length > 0;

  return (
    <section className="customers-page tech-page-surface">
      <header className="customers-hero tech-glass-panel">
        <div className="customers-hero-copy">
          <span className="tech-pill">CRM</span>
          <h1>Клиенты</h1>
          <p>Единая база клиентов, контактов и истории взаимодействий.</p>
        </div>
        <PermissionGate permission="crm.customers.create">
          <button className="tech-action customers-primary-action" type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} aria-hidden="true" />
            <span>Новый клиент</span>
          </button>
        </PermissionGate>
      </header>

      <section className="customers-search-panel tech-glass-panel" aria-label="Поиск клиентов">
        <div>
          <strong className="customers-panel-title">Поиск клиентов</strong>
          <p>Быстрый поиск по клиентской базе</p>
        </div>
        <SearchInput
          placeholder="Поиск по имени, телефону или коду"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </section>

      <section className="customers-list-panel tech-glass-panel" aria-label="Список клиентов">
        <div className="customers-list-header">
          <div>
            <h2>Список клиентов</h2>
          </div>
          <span className="customers-count">
            {customersQuery.isLoading ? 'Загрузка' : `Найдено: ${customers.length}`}
          </span>
        </div>

        {customersQuery.isLoading ? (
          <div className="customers-state" role="status">
            <span className="customers-loader" aria-hidden="true" />
            <div>
              <h3>Загрузка клиентов</h3>
              <p>Получаем актуальные данные CRM.</p>
            </div>
          </div>
        ) : null}

        {customersQuery.isError ? (
          <div className="customers-state customers-state-error" role="alert">
            <SearchX size={28} aria-hidden="true" />
            <div>
              <h3>Не удалось загрузить клиентов</h3>
              <p>Проверьте соединение с сервером и повторите запрос.</p>
            </div>
          </div>
        ) : null}

        {!customersQuery.isLoading && !customersQuery.isError && customers.length === 0 ? (
          <div className="customers-empty-state">
            <span className="customers-empty-icon" aria-hidden="true">
              <UsersRound size={34} />
            </span>
            <h3>{hasSearch ? 'Клиенты не найдены' : 'Клиентов пока нет'}</h3>
            <p>
              {hasSearch
                ? 'Попробуйте изменить поисковый запрос или проверьте написание.'
                : 'Создайте первого клиента, чтобы начать работу с CRM.'}
            </p>
            {!hasSearch ? (
              <PermissionGate permission="crm.customers.create">
                <button className="tech-action customers-empty-action" type="button" onClick={() => setIsCreateOpen(true)}>
                  <Plus size={18} aria-hidden="true" />
                  <span>Создать клиента</span>
                </button>
              </PermissionGate>
            ) : null}
          </div>
        ) : null}

        {!customersQuery.isLoading && !customersQuery.isError && customers.length > 0 ? (
          <div className="customers-card-grid">
            {customers.map((customer) => (
              <button
                key={customer.id}
                className="customer-card tech-card"
                type="button"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <span className="customer-card-glow" aria-hidden="true" />
                <span className="customer-card-topline">
                  <span className="customer-card-icon" aria-hidden="true">
                    {customer.customer_type === 'business' ? <Building2 size={22} /> : <UserRound size={22} />}
                  </span>
                  <span className="customer-type-pill">{getCustomerTypeLabel(customer)}</span>
                </span>
                <span className="customer-card-title">
                  <span>{customer.name}</span>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </span>
                <span className="customer-card-row">
                  <Hash size={16} aria-hidden="true" />
                  <span>{customer.customer_code}</span>
                </span>
                <span className="customer-card-row">
                  <Phone size={16} aria-hidden="true" />
                  <span>{customer.phone_primary || 'Телефон не указан'}</span>
                </span>
                <span className="customer-card-row">
                  <Mail size={16} aria-hidden="true" />
                  <span>{customer.email || 'Email не указан'}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <FormDrawer title="Новый клиент" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <CustomerForm onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isSubmitting={createMutation.isPending} />
      </FormDrawer>
    </section>
  );
}
