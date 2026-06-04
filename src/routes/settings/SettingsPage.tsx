import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../modules/admin/api/admin.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';

export function SettingsPage() {
  const [users, roles, permissions] = useQueries({
    queries: [
      { queryKey: ['adminUsers'], queryFn: adminApi.users },
      { queryKey: ['adminRoles'], queryFn: adminApi.roles },
      { queryKey: ['adminPermissions'], queryFn: adminApi.permissions },
    ],
  });
  const settings = useQuery({ queryKey: ['adminSettings'], queryFn: adminApi.settings });

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">Настройки</p><h1>Администрирование</h1></div>
      </header>
      <section className="page-toolbar">
        <Link to="/finance/accounts">Платежные счета</Link>
        <Link to="/finance/payment-methods">Способы оплаты</Link>
      </section>
      <section className="panel entity-summary">
        <h2>Основные настройки</h2>
        <p><strong>Приложение:</strong> {settings.data?.settings.appName ?? 'Rafef Tech'}</p>
        <p><strong>Авторизация:</strong> {settings.data?.settings.authMode ?? '-'}</p>
      </section>
      <section className="detail-grid">
        <article className="panel">
          <h2>Пользователи</h2>
          <DataTable rows={users.data?.items ?? []} isLoading={users.isLoading} emptyText="Пользователи не найдены" getRowKey={(u) => u.id} columns={[
            { key: 'username', header: 'Логин', render: (u) => u.username },
            { key: 'name', header: 'Имя', render: (u) => u.display_name },
            { key: 'role', header: 'Роль', render: (u) => u.role_code },
            { key: 'status', header: 'Статус', render: (u) => u.status },
          ]} />
        </article>
        <article className="panel">
          <h2>Роли</h2>
          <DataTable rows={roles.data?.items ?? []} isLoading={roles.isLoading} emptyText="Роли не найдены" getRowKey={(r) => r.id} columns={[
            { key: 'code', header: 'Код', render: (r) => r.code },
            { key: 'name', header: 'Название', render: (r) => r.name_ru },
          ]} />
        </article>
      </section>
      <section className="panel">
        <h2>Права доступа</h2>
        <DataTable rows={permissions.data?.items ?? []} isLoading={permissions.isLoading} emptyText="Права доступа не найдены" getRowKey={(p) => p.id} columns={[
          { key: 'module', header: 'Модуль', render: (p) => p.module },
          { key: 'code', header: 'Код', render: (p) => p.code },
          { key: 'name', header: 'Название', render: (p) => p.name_ru },
        ]} />
      </section>
    </>
  );
}
