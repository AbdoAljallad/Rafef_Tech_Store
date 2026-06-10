import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListTree, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../../modules/crm/api/crm.api';
import { projectsApi } from '../../modules/projects/api/projects.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

function formatProjectStatus(status: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`projects.statusOptions.${status}`, { ns: 'app', defaultValue: status });
}

export function ProjectsPage() {
  const { t } = useTranslation('app');
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
    if (!title.trim()) {
      return;
    }

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
          <p className="eyebrow">{t('projects.module')}</p>
          <h1>{t('projects.listTitle')}</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={<ListTree size={18} />} onClick={() => navigate('/projects/types')}>
            {t('projects.typesButton')}
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
            {t('projects.newProject')}
          </Button>
        </div>
      </header>

      <DataTable
        rows={projectsQuery.data?.items ?? []}
        isLoading={projectsQuery.isLoading}
        emptyText={projectsQuery.isError ? t('projects.loadProjectsFailed') : t('projects.noProjects')}
        getRowKey={(project) => project.id}
        onRowClick={(project) => navigate(`/projects/${project.id}`)}
        columns={[
          { key: 'code', header: t('projects.code'), render: (project) => project.project_code },
          { key: 'title', header: t('projects.name'), render: (project) => project.title },
          { key: 'type', header: t('projects.type'), render: (project) => project.project_type_name ?? project.project_type_id ?? '-' },
          { key: 'customer', header: t('projects.customer'), render: (project) => project.customer_name ?? project.customer_id ?? '-' },
          { key: 'status', header: t('projects.status'), render: (project) => formatProjectStatus(project.status, t) },
        ]}
      />

      <FormDrawer title={t('projects.newProjectTitle')} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form className="entity-form" onSubmit={createProject}>
          <Select label={t('projects.typeLabel')} value={projectTypeId} onChange={(event) => setProjectTypeId(event.target.value)}>
            <option value="">{t('projects.typeNone')}</option>
            {(typesQuery.data?.items ?? []).map((type) => (
              <option key={type.id} value={type.id}>
                {type.default_name}
              </option>
            ))}
          </Select>
          <Input label={t('projects.customerSearch')} value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />
          <Select label={t('projects.customer')} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">{t('projects.customerNone')}</option>
            {(customersQuery.data?.items ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customer_code} - {customer.name}
              </option>
            ))}
          </Select>
          <Input label={t('projects.name')} value={title} onChange={(event) => setTitle(event.target.value)} required />
          <Textarea label={t('projects.description')} value={description} onChange={(event) => setDescription(event.target.value)} />
          <Button type="submit" isLoading={createMutation.isPending}>
            {t('projects.createProject')}
          </Button>
        </form>
      </FormDrawer>
    </>
  );
}
