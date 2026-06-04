import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { crmApi } from '../../modules/crm/api/crm.api';
import { CustomerForm } from '../../modules/crm/components/CustomerForm';
import {
  contactFormSchema,
  locationFormSchema,
  noteFormSchema,
  type ContactFormValues,
  type CustomerFormValues,
  type LocationFormValues,
  type NoteFormValues,
} from '../../modules/crm/validators/customer.schemas';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Checkbox } from '../../shared/ui/Checkbox';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

type DrawerMode = 'edit' | 'contact' | 'location' | 'note' | null;

export function CustomerDetailPage() {
  const { id } = useParams();
  const customerId = Number(id);
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const queryClient = useQueryClient();
  const customerQuery = useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => crmApi.getCustomer(customerId),
    enabled: Number.isFinite(customerId),
  });
  const updateMutation = useMutation({
    mutationFn: (values: CustomerFormValues) => crmApi.updateCustomer(customerId, values),
    onSuccess: async () => {
      setDrawer(null);
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
  const contactMutation = useMutation({ mutationFn: (values: ContactFormValues) => crmApi.addContact(customerId, values), onSuccess: () => setDrawer(null) });
  const locationMutation = useMutation({ mutationFn: (values: LocationFormValues) => crmApi.addLocation(customerId, values), onSuccess: () => setDrawer(null) });
  const noteMutation = useMutation({ mutationFn: (values: NoteFormValues) => crmApi.addNote(customerId, values), onSuccess: () => setDrawer(null) });
  const customer = customerQuery.data?.customer;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>{customer?.name ?? 'Клиент'}</h1>
        </div>
        <Link to="/customers">К списку</Link>
      </header>

      {customerQuery.isLoading ? <section className="panel">Загрузка...</section> : null}
      {customerQuery.isError ? <section className="panel">Не удалось загрузить клиента</section> : null}
      {customer ? (
        <section className="detail-grid">
          <article className="panel entity-summary">
            <p><strong>Код:</strong> {customer.customer_code}</p>
            <p><strong>Телефон:</strong> {customer.phone_primary || '-'}</p>
            <p><strong>Email:</strong> {customer.email || '-'}</p>
            <p><strong>Тип:</strong> {customer.customer_type === 'business' ? 'Компания' : 'Физическое лицо'}</p>
            <PermissionGate permission="crm.customers.update">
              <Button onClick={() => setDrawer('edit')}>Редактировать</Button>
            </PermissionGate>
          </article>
          <article className="panel entity-actions">
            <PermissionGate permission="crm.customers.update">
              <Button variant="secondary" onClick={() => setDrawer('contact')}>Добавить контакт</Button>
              <Button variant="secondary" onClick={() => setDrawer('location')}>Добавить адрес</Button>
            </PermissionGate>
            <PermissionGate permission="crm.customers.notes.manage">
              <Button variant="secondary" onClick={() => setDrawer('note')}>Добавить заметку</Button>
            </PermissionGate>
          </article>
        </section>
      ) : null}

      <FormDrawer title="Редактировать клиента" isOpen={drawer === 'edit'} onClose={() => setDrawer(null)}>
        {customer ? <CustomerForm customer={customer} onSubmit={(values) => updateMutation.mutateAsync(values)} isSubmitting={updateMutation.isPending} /> : null}
      </FormDrawer>
      <FormDrawer title="Новый контакт" isOpen={drawer === 'contact'} onClose={() => setDrawer(null)}>
        <ContactForm onSubmit={(values) => contactMutation.mutateAsync(values)} isSubmitting={contactMutation.isPending} />
      </FormDrawer>
      <FormDrawer title="Новый адрес" isOpen={drawer === 'location'} onClose={() => setDrawer(null)}>
        <LocationForm onSubmit={(values) => locationMutation.mutateAsync(values)} isSubmitting={locationMutation.isPending} />
      </FormDrawer>
      <FormDrawer title="Новая заметка" isOpen={drawer === 'note'} onClose={() => setDrawer(null)}>
        <NoteForm onSubmit={(values) => noteMutation.mutateAsync(values)} isSubmitting={noteMutation.isPending} />
      </FormDrawer>
    </>
  );
}

function ContactForm({ onSubmit, isSubmitting }: { onSubmit: (values: ContactFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const form = useForm<ContactFormValues>({ resolver: zodResolver(contactFormSchema), defaultValues: { contactType: 'phone', contactValue: '', isPrimary: false } });
  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as ContactFormValues))}>
      <Select label="Тип" {...form.register('contactType')}>
        <option value="phone">Телефон</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="other">Другое</option>
      </Select>
      <Input label="Значение" error={form.formState.errors.contactValue?.message} {...form.register('contactValue')} />
      <Checkbox label="Основной" {...form.register('isPrimary')} />
      <Button type="submit" isLoading={isSubmitting}>Сохранить</Button>
    </form>
  );
}

function LocationForm({ onSubmit, isSubmitting }: { onSubmit: (values: LocationFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema) as unknown as Resolver<LocationFormValues>,
    defaultValues: { name: '', locationType: 'other', addressText: '', mapUrl: '', notes: '' },
  });
  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as LocationFormValues))}>
      <Input label="Название" error={form.formState.errors.name?.message} {...form.register('name')} />
      <Select label="Тип" {...form.register('locationType')}>
        <option value="home">Дом</option><option value="school">Школа</option><option value="company">Компания</option><option value="store">Магазин</option><option value="factory">Фабрика</option><option value="hospital">Больница</option><option value="other">Другое</option>
      </Select>
      <Textarea label="Адрес" {...form.register('addressText')} />
      <Input label="Ссылка на карту" {...form.register('mapUrl')} />
      <Textarea label="Заметки" {...form.register('notes')} />
      <Button type="submit" isLoading={isSubmitting}>Сохранить</Button>
    </form>
  );
}

function NoteForm({ onSubmit, isSubmitting }: { onSubmit: (values: NoteFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const form = useForm<NoteFormValues>({ resolver: zodResolver(noteFormSchema), defaultValues: { noteText: '' } });
  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as NoteFormValues))}>
      <Textarea label="Заметка" error={form.formState.errors.noteText?.message} {...form.register('noteText')} />
      <Button type="submit" isLoading={isSubmitting}>Сохранить</Button>
    </form>
  );
}
