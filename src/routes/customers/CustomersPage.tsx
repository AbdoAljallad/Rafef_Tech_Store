import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Building2, Hash, Mail, Phone, Plus, SearchX, Snowflake, UserRound, UsersRound } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../../modules/crm/api/crm.api';
import { CustomerForm } from '../../modules/crm/components/CustomerForm';
import type { Customer } from '../../modules/crm/types/crm.types';
import type { CustomerFormValues } from '../../modules/crm/validators/customer.schemas';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable/DataTable';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Select } from '../../shared/ui/Select';

type ViewMode = 'cards' | 'table';
type SortMode = 'name-asc' | 'name-desc' | 'code-asc' | 'code-desc' | 'created-desc' | 'created-asc';

const toggleButtonBaseStyle: CSSProperties = {
  minWidth: 'auto',
  padding: '0.55rem 0.95rem',
};

const tableActionButtonStyle: CSSProperties = {
  minWidth: 'auto',
  padding: '0.55rem 0.9rem',
};

function getCustomerTypeLabel(customer: Customer) {
  return customer.customer_type === 'business' ? 'Компания' : 'Физ. лицо';
}

function compareCustomers(left: Customer, right: Customer, sortMode: SortMode) {
  switch (sortMode) {
    case 'name-asc':
      return left.name.localeCompare(right.name, 'ru');
    case 'name-desc':
      return right.name.localeCompare(left.name, 'ru');
    case 'code-asc':
      return left.customer_code.localeCompare(right.customer_code, 'ru');
    case 'code-desc':
      return right.customer_code.localeCompare(left.customer_code, 'ru');
    case 'created-asc':
      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    case 'created-desc':
    default:
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  }
}

function clampPageSize(value: number) {
  return Math.min(Math.max(value, 1), 1000);
}

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageSizeInput, setPageSizeInput] = useState('20');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortMode, setSortMode] = useState<SortMode>('created-desc');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const customersQuery = useQuery({
    queryKey: ['customers', search, page, pageSize],
    queryFn: () => crmApi.listCustomers(search, { page, pageSize }),
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

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSortChange(value: string) {
    setSortMode(value as SortMode);
    setPage(1);
  }

  function handlePageSizeInputChange(value: string) {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setPageSizeInput(value);

    if (!value) {
      return;
    }

    const nextPageSize = clampPageSize(Number(value));
    setPageSize(nextPageSize);
    setPage(1);
  }

  function handlePageSizeBlur() {
    const normalized = clampPageSize(Number(pageSizeInput || pageSize));
    setPageSize(normalized);
    setPageSizeInput(String(normalized));
    setPage(1);
  }

  const customers = customersQuery.data?.items ?? [];
  const sortedCustomers = useMemo(() => [...customers].sort((left, right) => compareCustomers(left, right, sortMode)), [customers, sortMode]);
  const meta = customersQuery.data?.meta;
  const hasMeta = Boolean(meta && typeof meta.total === 'number' && typeof meta.totalPages === 'number');
  const total = hasMeta ? meta!.total : (page - 1) * pageSize + sortedCustomers.length;
  const totalPages = hasMeta ? meta!.totalPages : (sortedCustomers.length === pageSize ? page + 1 : page);
  const hasNextPage = hasMeta ? page < totalPages : sortedCustomers.length === pageSize;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : (page - 1) * pageSize + sortedCustomers.length;
  const hasSearch = search.trim().length > 0;

  const tableColumns = useMemo<DataTableColumn<Customer>[]>(
    () => [
      {
        key: 'type',
        header: 'Тип',
        render: (customer) => (
          <span className="customers-type-cell">
            {customer.customer_type === 'business' ? <Building2 size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
            <span>{getCustomerTypeLabel(customer)}</span>
            {customer.is_frozen ? <Snowflake size={14} aria-label="Клиент заморожен" /> : null}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Клиент',
        render: (customer) => customer.name,
      },
      {
        key: 'code',
        header: 'Код',
        render: (customer) => customer.customer_code,
      },
      {
        key: 'phone',
        header: 'Телефон',
        render: (customer) => customer.phone_primary || 'Телефон не указан',
      },
      {
        key: 'email',
        header: 'Email',
        render: (customer) => customer.email || 'Email не указан',
      },
      {
        key: 'action',
        header: 'Действие',
        render: (customer) => (
          <Button
            type="button"
            variant="secondary"
            style={tableActionButtonStyle}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/customers/${customer.id}`);
            }}
          >
            Открыть
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <section className="customers-page tech-page-surface">
      <style>{`
        .customers-inline-controls {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .customers-view-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.3rem;
          border: 1px solid rgba(125, 211, 252, 0.42);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .customers-type-cell {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          color: var(--color-text);
          font-weight: 600;
        }

        .customers-page-size {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.45rem 0.8rem;
          border: 1px solid rgba(125, 211, 252, 0.42);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--color-primary-strong);
          font-weight: 700;
        }

        .customers-page-size input {
          width: 92px;
          padding: 0.45rem 0.7rem;
          border: 1px solid var(--color-border);
          border-radius: 999px;
          background: #fff;
          color: var(--color-text);
        }

        .customers-table-wrap {
          display: grid;
          gap: 1rem;
        }

        .customers-table-wrap .data-table-wrap {
          overflow-x: auto;
          border-radius: 18px;
          border: 1px solid rgba(125, 211, 252, 0.24);
          background: rgba(255, 255, 255, 0.7);
        }

        .customers-table-wrap .data-table tr.clickable {
          cursor: pointer;
        }

        .customers-table-wrap .data-table tr.clickable:hover {
          background: rgba(8, 120, 215, 0.06);
        }

        .customer-card-avatar {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          overflow: hidden;
          display: grid;
          place-items: center;
          border: 1px solid rgba(125, 211, 252, 0.34);
          background: rgba(255, 255, 255, 0.78);
          color: var(--color-primary-strong);
        }

        .customer-card-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .customer-card-topline {
          align-items: center;
        }

        .customer-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          background: rgba(8, 120, 215, 0.09);
          color: var(--color-primary-strong);
          font-size: 0.8rem;
          font-weight: 800;
        }

        .customers-pagination-extended {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        @media (max-width: 860px) {
          .customers-inline-controls {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>

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
          <p>Быстрый поиск по клиентской базе.</p>
        </div>
        <SearchInput
          placeholder="Поиск по имени, телефону или коду"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </section>

      <section className="customers-list-panel tech-glass-panel" aria-label="Список клиентов">
        <div className="customers-list-header">
          <div>
            <h2>Список клиентов</h2>
          </div>
          <div className="customers-inline-controls">
            <div className="customers-view-toggle" aria-label="Переключение режима списка">
              <Button
                type="button"
                variant={viewMode === 'cards' ? 'primary' : 'secondary'}
                style={toggleButtonBaseStyle}
                onClick={() => setViewMode('cards')}
              >
                Карточки
              </Button>
              <Button
                type="button"
                variant={viewMode === 'table' ? 'primary' : 'secondary'}
                style={toggleButtonBaseStyle}
                onClick={() => setViewMode('table')}
              >
                Таблица
              </Button>
            </div>

            <label className="customers-page-size">
              <span>На странице</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={pageSizeInput}
                placeholder="1-1000"
                aria-label="Количество клиентов на странице"
                onChange={(event) => handlePageSizeInputChange(event.target.value)}
                onBlur={handlePageSizeBlur}
              />
            </label>

            <Select aria-label="Сортировка клиентов" value={sortMode} onChange={(event) => handleSortChange(event.target.value)}>
              <option value="name-asc">Имя: А-Я</option>
              <option value="name-desc">Имя: Я-А</option>
              <option value="code-asc">Код: по возрастанию</option>
              <option value="code-desc">Код: по убыванию</option>
              <option value="created-desc">Дата создания: сначала новые</option>
              <option value="created-asc">Дата создания: сначала старые</option>
            </Select>

            <span className="customers-count">
              {customersQuery.isLoading
                ? 'Загрузка'
                : hasMeta
                  ? `Показано: ${rangeStart}-${rangeEnd} из ${total}`
                  : `Показано: ${rangeStart}-${rangeEnd}`}
            </span>
          </div>
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

        {!customersQuery.isLoading && !customersQuery.isError && sortedCustomers.length === 0 ? (
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

        {!customersQuery.isLoading && !customersQuery.isError && sortedCustomers.length > 0 ? (
          <>
            {viewMode === 'cards' ? (
              <div className="customers-card-grid">
                {sortedCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    className="customer-card tech-card"
                    type="button"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <span className="customer-card-glow" aria-hidden="true" />
                    <span className="customer-card-topline">
                      <span className="customer-card-avatar" aria-hidden="true">
                        {customer.avatar_url ? <img src={customer.avatar_url} alt="" /> : <UserRound size={22} />}
                      </span>
                      <span className="customer-type-pill">{getCustomerTypeLabel(customer)}</span>
                      {customer.is_frozen ? (
                        <span className="customer-status-pill">
                          <Snowflake size={14} aria-hidden="true" />
                          <span>Заморожен</span>
                        </span>
                      ) : null}
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
            ) : (
              <div className="customers-table-wrap">
                <DataTable
                  columns={tableColumns}
                  rows={sortedCustomers}
                  isLoading={customersQuery.isLoading}
                  emptyText="Клиенты не найдены"
                  getRowKey={(customer) => customer.id}
                  onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
                />
              </div>
            )}

            <div className="customers-pagination customers-pagination-extended" aria-label="Навигация по страницам клиентов">
              <Button type="button" variant="secondary" aria-label="Перейти на первую страницу" disabled={page <= 1} onClick={() => setPage(1)}>
                {'<<'}
              </Button>
              <Button type="button" variant="secondary" aria-label="Перейти на предыдущую страницу" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Назад
              </Button>
              <span className="customers-pagination-status">
                {hasMeta ? `Страница ${page} из ${totalPages}` : `Страница ${page}`}
              </span>
              <Button type="button" variant="secondary" aria-label="Перейти на следующую страницу" disabled={!hasNextPage} onClick={() => setPage((current) => current + 1)}>
                Вперёд
              </Button>
              <Button type="button" variant="secondary" aria-label="Перейти на последнюю страницу" disabled={!hasMeta || page >= totalPages} onClick={() => setPage(totalPages)}>
                {'>>'}
              </Button>
            </div>
          </>
        ) : null}
      </section>

      <FormDrawer title="Новый клиент" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <CustomerForm onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isSubmitting={createMutation.isPending} />
      </FormDrawer>
    </section>
  );
}
