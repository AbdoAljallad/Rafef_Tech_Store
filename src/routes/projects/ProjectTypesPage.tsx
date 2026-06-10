import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../modules/projects/api/projects.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Textarea } from '../../shared/ui/Textarea';

export function ProjectTypesPage() {
  const { t } = useTranslation('app');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [defaultName, setDefaultName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();
  const typesQuery = useQuery({ queryKey: ['projectTypes'], queryFn: projectsApi.listTypes });
  const createMutation = useMutation({
    mutationFn: projectsApi.createType,
    onSuccess: async () => {
      setIsCreateOpen(false);
      setCode('');
      setDefaultName('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
    },
  });

  async function createType(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim() || !defaultName.trim()) return;
    await createMutation.mutateAsync({ code: code.trim(), defaultName: defaultName.trim(), description: description.trim() || null });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('projects.module')}</p>
          <h1>{t('projects.projectTypesTitle')}</h1>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
          {t('projects.newType')}
        </Button>
      </header>

      <DataTable
        rows={typesQuery.data?.items ?? []}
        isLoading={typesQuery.isLoading}
        emptyText={typesQuery.isError ? t('projects.loadTypesFailed') : t('projects.noTypes')}
        getRowKey={(type) => type.id}
        columns={[
          { key: 'code', header: t('projects.code'), render: (type) => type.code },
          { key: 'name', header: t('projects.name'), render: (type) => type.default_name },
          { key: 'description', header: t('projects.description'), render: (type) => type.description ?? '-' },
        ]}
      />

      <FormDrawer title={t('projects.newProjectType')} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form className="entity-form" onSubmit={createType}>
          <Input label={t('projects.code')} value={code} onChange={(event) => setCode(event.target.value)} required />
          <Input label={t('projects.name')} value={defaultName} onChange={(event) => setDefaultName(event.target.value)} required />
          <Textarea label={t('projects.description')} value={description} onChange={(event) => setDescription(event.target.value)} />
          <Button type="submit" isLoading={createMutation.isPending}>{t('projects.createType')}</Button>
        </form>
      </FormDrawer>
    </>
  );
}
