import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { categoryFormSchema, type CategoryFormValues } from '../../modules/catalog/validators/catalog.schemas';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Checkbox } from '../../shared/ui/Checkbox';
import { Input } from '../../shared/ui/Input';

export function CategoriesPage() {
  const { t } = useTranslation(['app', 'common']);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories });
  const create = useMutation({
    mutationFn: catalogApi.createCategory,
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('catalog.module', { ns: 'app' })}</p>
          <h1>{t('catalog.categories', { ns: 'app' })}</h1>
        </div>
        <div className="page-actions">
          <Link to="/catalog/products">{t('catalog.backToProducts', { ns: 'app' })}</Link>
          <PermissionGate permission="catalog.products.manage">
            <Button icon={<Plus size={18} />} onClick={() => setOpen(true)}>
              {t('catalog.newCategory', { ns: 'app' })}
            </Button>
          </PermissionGate>
        </div>
      </header>
      <DataTable
        rows={categories.data?.items ?? []}
        isLoading={categories.isLoading}
        emptyText={t('catalog.emptyCategories', { ns: 'app' })}
        getRowKey={(category) => category.id}
        columns={[
          { key: 'code', header: t('customers.code', { ns: 'app' }), render: (category) => category.code },
          { key: 'name', header: t('catalog.name', { ns: 'app' }), render: (category) => category.default_name },
        ]}
      />
      <FormDrawer title={t('catalog.newCategory', { ns: 'app' })} isOpen={open} onClose={() => setOpen(false)}>
        <CategoryForm onSubmit={(values) => create.mutateAsync(values)} isSubmitting={create.isPending} />
      </FormDrawer>
    </>
  );
}

function CategoryForm({ onSubmit, isSubmitting }: { onSubmit: (values: CategoryFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const { t } = useTranslation(['app', 'common']);
  const form = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { code: '', defaultName: '', showInSales: true, showInRepair: false, showInProjects: false, showInCreative: false },
  });

  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as CategoryFormValues))}>
      <Input label={t('customers.code', { ns: 'app' })} error={form.formState.errors.code?.message} {...form.register('code')} />
      <Input label={t('catalog.name', { ns: 'app' })} error={form.formState.errors.defaultName?.message} {...form.register('defaultName')} />
      <Checkbox label={t('catalog.categoryFlags.sales', { ns: 'app' })} {...form.register('showInSales')} />
      <Checkbox label={t('catalog.categoryFlags.repair', { ns: 'app' })} {...form.register('showInRepair')} />
      <Checkbox label={t('catalog.categoryFlags.projects', { ns: 'app' })} {...form.register('showInProjects')} />
      <Checkbox label={t('catalog.categoryFlags.creative', { ns: 'app' })} {...form.register('showInCreative')} />
      <Button type="submit" isLoading={isSubmitting}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
