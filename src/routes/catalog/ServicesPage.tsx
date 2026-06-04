import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { supplierFormSchema, type SupplierFormValues } from '../../modules/catalog/validators/catalog.schemas';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay/MoneyDisplay';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Textarea } from '../../shared/ui/Textarea';

export function ServicesPage() {
  const [supplierOpen, setSupplierOpen] = useState(false);
  const services = useQuery({ queryKey: ['services'], queryFn: () => catalogApi.listServices() });
  const supplier = useMutation({ mutationFn: catalogApi.createSupplier, onSuccess: () => setSupplierOpen(false) });
  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">Catalog</p><h1>Услуги и поставщики</h1></div>
        <div className="page-actions"><Link to="/catalog/products">К товарам</Link><PermissionGate permission="catalog.suppliers.manage"><Button icon={<Plus size={18} />} onClick={() => setSupplierOpen(true)}>Новый поставщик</Button></PermissionGate></div>
      </header>
      <DataTable rows={services.data?.items ?? []} isLoading={services.isLoading} emptyText="Услуги не найдены" getRowKey={(service) => service.id} columns={[
        { key: 'name', header: 'Услуга', render: (service) => service.default_name },
        { key: 'module', header: 'Модуль', render: (service) => service.module },
        { key: 'category', header: 'Категория', render: (service) => service.category_name },
        { key: 'price', header: 'Цена', render: (service) => <MoneyDisplay value={service.default_price} /> },
      ]} />
      <FormDrawer title="Новый поставщик" isOpen={supplierOpen} onClose={() => setSupplierOpen(false)}>
        <SupplierForm onSubmit={(values) => supplier.mutateAsync(values)} isSubmitting={supplier.isPending} />
      </FormDrawer>
    </>
  );
}

function SupplierForm({ onSubmit, isSubmitting }: { onSubmit: (values: SupplierFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const form = useForm({ resolver: zodResolver(supplierFormSchema), defaultValues: { name: '', phone: '', email: '', addressText: '', notes: '' } });
  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as SupplierFormValues))}>
      <Input label="Название" error={form.formState.errors.name?.message} {...form.register('name')} />
      <Input label="Телефон" {...form.register('phone')} />
      <Input label="Email" {...form.register('email')} />
      <Textarea label="Адрес" {...form.register('addressText')} />
      <Textarea label="Заметки" {...form.register('notes')} />
      <Button type="submit" isLoading={isSubmitting}>Сохранить</Button>
    </form>
  );
}
