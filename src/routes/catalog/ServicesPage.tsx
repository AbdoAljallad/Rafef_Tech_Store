import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['app', 'common']);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const services = useQuery({ queryKey: ['services'], queryFn: () => catalogApi.listServices() });
  const supplier = useMutation({ mutationFn: catalogApi.createSupplier, onSuccess: () => setSupplierOpen(false) });

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('catalog.module', { ns: 'app' })}</p>
          <h1>{t('catalog.servicesTitle', { ns: 'app' })}</h1>
        </div>
        <div className="page-actions">
          <Link to="/catalog/products">{t('catalog.backToProducts', { ns: 'app' })}</Link>
          <PermissionGate permission="catalog.suppliers.manage">
            <Button icon={<Plus size={18} />} onClick={() => setSupplierOpen(true)}>
              {t('catalog.newSupplier', { ns: 'app' })}
            </Button>
          </PermissionGate>
        </div>
      </header>
      <DataTable
        rows={services.data?.items ?? []}
        isLoading={services.isLoading}
        emptyText={t('catalog.emptyServices', { ns: 'app' })}
        getRowKey={(service) => service.id}
        columns={[
          { key: 'name', header: t('catalog.serviceColumn', { ns: 'app' }), render: (service) => service.default_name },
          { key: 'module', header: t('catalog.moduleColumn', { ns: 'app' }), render: (service) => service.module },
          { key: 'category', header: t('catalog.category', { ns: 'app' }), render: (service) => service.category_name },
          { key: 'price', header: t('catalog.price', { ns: 'app' }), render: (service) => <MoneyDisplay value={service.default_price} /> },
        ]}
      />
      <FormDrawer title={t('catalog.newSupplierTitle', { ns: 'app' })} isOpen={supplierOpen} onClose={() => setSupplierOpen(false)}>
        <SupplierForm onSubmit={(values) => supplier.mutateAsync(values)} isSubmitting={supplier.isPending} />
      </FormDrawer>
    </>
  );
}

function SupplierForm({ onSubmit, isSubmitting }: { onSubmit: (values: SupplierFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const { t } = useTranslation(['app', 'common']);
  const form = useForm({ resolver: zodResolver(supplierFormSchema), defaultValues: { name: '', phone: '', email: '', addressText: '', notes: '' } });

  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as SupplierFormValues))}>
      <Input label={t('catalog.supplierName', { ns: 'app' })} error={form.formState.errors.name?.message} {...form.register('name')} />
      <Input label={t('catalog.supplierPhone', { ns: 'app' })} {...form.register('phone')} />
      <Input label={t('catalog.supplierEmail', { ns: 'app' })} {...form.register('email')} />
      <Textarea label={t('catalog.supplierAddress', { ns: 'app' })} {...form.register('addressText')} />
      <Textarea label={t('catalog.supplierNotes', { ns: 'app' })} {...form.register('notes')} />
      <Button type="submit" isLoading={isSubmitting}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
