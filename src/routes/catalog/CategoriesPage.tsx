import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories });
  const create = useMutation({ mutationFn: catalogApi.createCategory, onSuccess: async () => { setOpen(false); await queryClient.invalidateQueries({ queryKey: ['categories'] }); } });
  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">Catalog</p><h1>Категории</h1></div>
        <div className="page-actions"><Link to="/catalog/products">К товарам</Link><PermissionGate permission="catalog.products.manage"><Button icon={<Plus size={18} />} onClick={() => setOpen(true)}>Новая категория</Button></PermissionGate></div>
      </header>
      <DataTable rows={categories.data?.items ?? []} isLoading={categories.isLoading} emptyText="Категории не найдены" getRowKey={(category) => category.id} columns={[
        { key: 'code', header: 'Код', render: (category) => category.code },
        { key: 'name', header: 'Название', render: (category) => category.default_name },
      ]} />
      <FormDrawer title="Новая категория" isOpen={open} onClose={() => setOpen(false)}>
        <CategoryForm onSubmit={(values) => create.mutateAsync(values)} isSubmitting={create.isPending} />
      </FormDrawer>
    </>
  );
}

function CategoryForm({ onSubmit, isSubmitting }: { onSubmit: (values: CategoryFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const form = useForm({ resolver: zodResolver(categoryFormSchema), defaultValues: { code: '', defaultName: '', showInSales: true, showInRepair: false, showInProjects: false, showInCreative: false } });
  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as CategoryFormValues))}>
      <Input label="Код" error={form.formState.errors.code?.message} {...form.register('code')} />
      <Input label="Название" error={form.formState.errors.defaultName?.message} {...form.register('defaultName')} />
      <Checkbox label="Показывать в продажах" {...form.register('showInSales')} />
      <Checkbox label="Показывать в ремонте" {...form.register('showInRepair')} />
      <Checkbox label="Показывать в проектах" {...form.register('showInProjects')} />
      <Checkbox label="Показывать в дизайне/печати" {...form.register('showInCreative')} />
      <Button type="submit" isLoading={isSubmitting}>Сохранить</Button>
    </form>
  );
}
