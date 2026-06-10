import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListTree, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../../modules/crm/api/crm.api';
import { projectsApi } from '../../modules/projects/api/projects.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

export function ProjectsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [projectTypeId, setProjectTypeId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.listProjects({ offset: 0, limit: 50 }) });
  const typesQuery = useQuery({ queryKey: ['projectTypes'], queryFn: projectsApi.listTypes });
  const customersQuery = useQuery({ queryKey: ['customers', customerSearch], queryFn: () => crmApi.listCustomers(customerSearch) });
  const createMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: async (response) => {
      setIsCreateOpen(false);
      setProjectTypeId('');
      setCustomerId('');
      setTitle('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${response.project.id}`);
    },
  });

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await createMutation.mutateAsync({
      projectTypeId: projectTypeId ? Number(projectTypeId) : null,
      customerId: customerId ? Number(customerId) : null,
      title: title.trim(),
      description: description.trim() || null,
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Проекты</p>
          <h1>Проекты CCTV и сетей</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={<ListTree size={18} />} onClick={() => navigate('/projects/types')}>Типы</Button>
          <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>Новый проект</Button>
        </div>
      </header>

      <DataTable
        rows={projectsQuery.data?.items ?? []}
        isLoading={projectsQuery.isLoading}
        emptyText={projectsQuery.isError ? 'Не удалось загрузить проекты' : 'Проекты отсутствуют'}
        getRowKey={(project) => project.id}
        onRowClick={(project) => navigate(`/projects/${project.id}`)}
        columns={[
          { key: 'code', header: 'Код', render: (project) => project.project_code },
          { key: 'title', header: 'Название', render: (project) => project.title },
          { key: 'type', header: 'Тип', render: (project) => project.project_type_name ?? project.project_type_id ?? '-' },
          { key: 'customer', header: 'Клиент', render: (project) => project.customer_name ?? project.customer_id ?? '-' },
          { key: 'status', header: 'Статус', render: (project) => project.status },
        ]}
      />

      <FormDrawer title="Новый проект" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form className="entity-form" onSubmit={createProject}>
          <Select label="Тип проекта" value={projectTypeId} onChange={(event) => setProjectTypeId(event.target.value)}>
            <option value="">Без типа</option>
            {(typesQuery.data?.items ?? []).map((type) => <option key={type.id} value={type.id}>{type.default_name}</option>)}
          </Select>
          <Input label="Поиск клиента" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />
          <Select label="Клиент" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">Без клиента</option>
            {(customersQuery.data?.items ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_code} - {customer.name}</option>)}
          </Select>
          <Input label="Название" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <Textarea label="Описание" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Button type="submit" isLoading={createMutation.isPending}>Создать проект</Button>
        </form>
      </FormDrawer>
    </>
  );
}
