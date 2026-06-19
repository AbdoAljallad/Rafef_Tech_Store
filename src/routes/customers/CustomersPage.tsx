import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Building2, Hash, Mail, Phone, Plus, SearchX, Snowflake, UserRound, UsersRound } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { crmApi } from '../../modules/crm/api/crm.api';
import { CustomerForm } from '../../modules/crm/components/CustomerForm';
import type { Customer, CustomerSortMode } from '../../modules/crm/types/crm.types';
import type { CustomerFormValues } from '../../modules/crm/validators/customer.schemas';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Select } from '../../shared/ui/Select';
import { formatListingPage, formatListingResults } from '../../shared/utils/listingText';

type ViewMode = 'cards' | 'table';
type SortMode = CustomerSortMode;

const toggleButtonBaseStyle: CSSProperties = {
  minWidth: 'auto',
  padding: '0.55rem 0.95rem',
};

const tableActionButtonStyle: CSSProperties = {
  minWidth: 'auto',
  padding: '0.55rem 0.9rem',
};

function clampPageSize(value: number) {
  return Math.min(Math.max(value, 1), 1000);
}

export function CustomersPage() {
  const { t } = useTranslation('app');
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
    queryKey: ['customers', search, sortMode, page, pageSize],
    queryFn: () => crmApi.listCustomers(search, { page, pageSize, sortMode }),
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
    if (!/^\d*$/.test(value)) return;

    setPageSizeInput(value);

    if (!value) return;

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

  function getCustomerTypeLabel(customer: Customer) {
    return customer.customer_type === 'business' ? t('customers.business') : t('customers.individual');
  }

  const customers = customersQuery.data?.items ?? [];
  const meta = customersQuery.data?.meta;
  const hasMeta = Boolean(meta && typeof meta.total === 'number' && typeof meta.totalPages === 'number');
  const total = hasMeta ? meta!.total : (page - 1) * pageSize + customers.length;
  const totalPages = hasMeta ? meta!.totalPages : (customers.length === pageSize ? page + 1 : page);
  const hasNextPage = hasMeta ? page < totalPages : customers.length === pageSize;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : (page - 1) * pageSize + customers.length;
  const hasSearch = search.trim().length > 0;

  const tableColumns = useMemo<DataTableColumn<Customer>[]>(
    () => [
      {
        key: 'type',
        header: t('customers.type'),
        render: (customer) => (
          <span className="customers-type-cell">
            {customer.customer_type === 'business' ? <Building2 size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
            <span>{getCustomerTypeLabel(customer)}</span>
            {customer.is_frozen ? <Snowflake size={14} aria-label={t('customers.frozen')} /> : null}
          </span>
        ),
      },
      {
        key: 'name',
        header: t('customers.customer'),
        render: (customer) => customer.name,
      },
      {
        key: 'code',
        header: t('customers.code'),
        render: (customer) => customer.customer_code,
      },
      {
        key: 'phone',
        header: t('customers.phone'),
        render: (customer) => customer.phone_primary || t('customers.missingPhone'),
      },
      {
        key: 'email',
        header: t('customers.email'),
        render: (customer) => customer.email || t('customers.missingEmail'),
      },
      {
        key: 'action',
        header: t('customers.action'),
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
            {t('system.listing.open')}
          </Button>
        ),
      },
    ],
    [navigate, t],
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
          <span className="tech-pill">{t('customers.module')}</span>
          <h1>{t('customers.title')}</h1>
          <p>{t('customers.heroDescription')}</p>
        </div>
        <PermissionGate permission="crm.customers.create">
          <button className="tech-action customers-primary-action" type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} aria-hidden="true" />
            <span>{t('customers.newCustomer')}</span>
          </button>
        </PermissionGate>
      </header>

      <section className="customers-search-panel tech-glass-panel" aria-label={t('customers.searchAria')}>
        <div>
          <strong className="customers-panel-title">{t('customers.searchTitle')}</strong>
          <p>{t('customers.searchDescription')}</p>
        </div>
        <SearchInput
          placeholder={t('customers.searchPlaceholder')}
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </section>

      <section className="customers-list-panel tech-glass-panel" aria-label={t('customers.listAria')}>
        <div className="customers-list-header">
          <div>
            <h2>{t('customers.listTitle')}</h2>
          </div>
          <div className="customers-inline-controls">
            <div className="customers-view-toggle" aria-label={t('customers.viewModeAria')}>
              <Button
                type="button"
                variant={viewMode === 'cards' ? 'primary' : 'secondary'}
                style={toggleButtonBaseStyle}
                onClick={() => setViewMode('cards')}
              >
                {t('system.listing.cards')}
              </Button>
              <Button
                type="button"
                variant={viewMode === 'table' ? 'primary' : 'secondary'}
                style={toggleButtonBaseStyle}
                onClick={() => setViewMode('table')}
              >
                {t('system.listing.table')}
              </Button>
            </div>

            <label className="customers-page-size">
              <span>{t('system.listing.perPage')}</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={pageSizeInput}
                placeholder="1-1000"
                aria-label={t('customers.pageSizeAria')}
                onChange={(event) => handlePageSizeInputChange(event.target.value)}
                onBlur={handlePageSizeBlur}
              />
            </label>

            <Select aria-label={t('customers.sortAria')} value={sortMode} onChange={(event) => handleSortChange(event.target.value)}>
              <option value="name-asc">{t('customers.sort.nameAsc')}</option>
              <option value="name-desc">{t('customers.sort.nameDesc')}</option>
              <option value="code-asc">{t('customers.sort.codeAsc')}</option>
              <option value="code-desc">{t('customers.sort.codeDesc')}</option>
              <option value="created-desc">{t('customers.sort.createdDesc')}</option>
              <option value="created-asc">{t('customers.sort.createdAsc')}</option>
            </Select>

            <span className="customers-count">
              {customersQuery.isLoading
                ? t('home.loading')
                : formatListingResults(t, { from: rangeStart, to: rangeEnd, total: hasMeta ? total : null })}
            </span>
          </div>
        </div>

        {customersQuery.isLoading ? (
          <div className="customers-state" role="status">
            <span className="customers-loader" aria-hidden="true" />
            <div>
              <h3>{t('customers.states.loadingTitle')}</h3>
              <p>{t('customers.states.loadingText')}</p>
            </div>
          </div>
        ) : null}

        {customersQuery.isError ? (
          <div className="customers-state customers-state-error" role="alert">
            <SearchX size={28} aria-hidden="true" />
            <div>
              <h3>{t('customers.states.errorTitle')}</h3>
              <p>{t('customers.states.errorText')}</p>
            </div>
          </div>
        ) : null}

        {!customersQuery.isLoading && !customersQuery.isError && customers.length === 0 ? (
          <div className="customers-empty-state">
            <span className="customers-empty-icon" aria-hidden="true">
              <UsersRound size={34} />
            </span>
            <h3>{hasSearch ? t('customers.states.emptySearchTitle') : t('customers.states.emptyTitle')}</h3>
            <p>{hasSearch ? t('customers.states.emptySearchText') : t('customers.states.emptyText')}</p>
            {!hasSearch ? (
              <PermissionGate permission="crm.customers.create">
                <button className="tech-action customers-empty-action" type="button" onClick={() => setIsCreateOpen(true)}>
                  <Plus size={18} aria-hidden="true" />
                  <span>{t('customers.createCustomer')}</span>
                </button>
              </PermissionGate>
            ) : null}
          </div>
        ) : null}

        {!customersQuery.isLoading && !customersQuery.isError && customers.length > 0 ? (
          <>
            {viewMode === 'cards' ? (
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
                      <span className="customer-card-avatar" aria-hidden="true">
                        {customer.avatar_url ? <img src={customer.avatar_url} alt="" /> : <UserRound size={22} />}
                      </span>
                      <span className="customer-type-pill">{getCustomerTypeLabel(customer)}</span>
                      {customer.is_frozen ? (
                        <span className="customer-status-pill">
                          <Snowflake size={14} aria-hidden="true" />
                          <span>{t('customers.frozen')}</span>
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
                      <span>{customer.phone_primary || t('customers.missingPhone')}</span>
                    </span>
                    <span className="customer-card-row">
                      <Mail size={16} aria-hidden="true" />
                      <span>{customer.email || t('customers.missingEmail')}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="customers-table-wrap">
                <DataTable
                  columns={tableColumns}
                  rows={customers}
                  isLoading={customersQuery.isLoading}
                  loadingText={t('home.loading')}
                  emptyText={t('customers.states.emptySearchTitle')}
                  getRowKey={(customer) => customer.id}
                  onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
                />
              </div>
            )}

            <div className="customers-pagination customers-pagination-extended" aria-label={t('customers.paginationAria')}>
              <Button type="button" variant="secondary" aria-label={t('system.listing.first')} disabled={page <= 1} onClick={() => setPage(1)}>
                {'<<'}
              </Button>
              <Button type="button" variant="secondary" aria-label={t('system.listing.previous')} disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                {t('system.listing.previous')}
              </Button>
              <span className="customers-pagination-status">
                {formatListingPage(t, { page, totalPages: hasMeta ? totalPages : null })}
              </span>
              <Button type="button" variant="secondary" aria-label={t('system.listing.next')} disabled={!hasNextPage} onClick={() => setPage((current) => current + 1)}>
                {t('system.listing.next')}
              </Button>
              <Button type="button" variant="secondary" aria-label={t('system.listing.last')} disabled={!hasMeta || page >= totalPages} onClick={() => setPage(totalPages)}>
                {'>>'}
              </Button>
            </div>
          </>
        ) : null}
      </section>

      <FormDrawer title={t('customers.newCustomer')} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <CustomerForm onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isSubmitting={createMutation.isPending} />
      </FormDrawer>
    </section>
  );
}
