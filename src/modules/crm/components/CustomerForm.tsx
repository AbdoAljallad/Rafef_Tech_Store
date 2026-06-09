import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Upload, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { Textarea } from '../../../shared/ui/Textarea';
import { customerFormSchema, type CustomerFormValues } from '../validators/customer.schemas';
import type { Customer } from '../types/crm.types';

type CustomerFormProps = {
  customer?: Customer;
  onSubmit: (values: CustomerFormValues) => Promise<unknown>;
  onCancel?: () => void;
  isSubmitting?: boolean;
};

function getInitialContacts(customer?: Customer): CustomerFormValues['contacts'] {
  if (customer?.contacts && customer.contacts.length > 0) {
    return customer.contacts.map((contact) => ({
      contactType: contact.contact_type,
      contactValue: contact.contact_value,
      isPrimary: Boolean(contact.is_primary),
    }));
  }

  const fallbackContacts: CustomerFormValues['contacts'] = [];

  if (customer?.phone_primary) {
    fallbackContacts.push({ contactType: 'phone', contactValue: customer.phone_primary, isPrimary: true });
  }

  if (customer?.phone_secondary) {
    fallbackContacts.push({ contactType: 'phone', contactValue: customer.phone_secondary, isPrimary: false });
  }

  if (customer?.email) {
    fallbackContacts.push({ contactType: 'email', contactValue: customer.email, isPrimary: true });
  }

  return fallbackContacts;
}

export function CustomerForm({ customer, onSubmit, onCancel, isSubmitting }: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema) as unknown as Resolver<CustomerFormValues>,
    defaultValues: {
      name: customer?.name ?? '',
      avatarUrl: customer?.avatar_url ?? null,
      customerType: customer?.customer_type ?? 'person',
      notes: customer?.notes ?? '',
      contacts: getInitialContacts(customer),
    },
  });

  const contactsFieldArray = useFieldArray({
    control: form.control,
    name: 'contacts',
  });

  const avatarPreview = form.watch('avatarUrl');
  const contacts = form.watch('contacts');

  const contactPrimaryLabels = useMemo(
    () => contacts.map((contact) => `${contact.contactType}-${contact.contactValue || ''}`),
    [contacts],
  );

  async function handleImageSelection(file: File | null) {
    if (!file) {
      form.setValue('avatarUrl', null, { shouldDirty: true, shouldValidate: true });
      return;
    }

    const imageData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });

    form.setValue('avatarUrl', imageData, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <form className="entity-form customer-create-form" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
      <style>{`
        .customer-form-avatar {
          display: grid;
          gap: 1rem;
          justify-items: start;
        }

        .customer-form-avatar-preview {
          width: 96px;
          height: 96px;
          border: 1px solid rgba(125, 211, 252, 0.42);
          border-radius: 24px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .customer-form-avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .customer-form-avatar-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .customer-form-file {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8rem 1rem;
          border: 1px dashed rgba(8, 120, 215, 0.34);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--color-primary-strong);
          cursor: pointer;
          font-weight: 700;
        }

        .customer-form-file input {
          display: none;
        }

        .customer-contacts-list {
          display: grid;
          gap: 1rem;
        }

        .customer-contact-card {
          display: grid;
          gap: 0.85rem;
          padding: 1rem;
          border: 1px solid rgba(125, 211, 252, 0.24);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.64);
        }

        .customer-contact-grid {
          display: grid;
          grid-template-columns: minmax(0, 180px) minmax(0, 1fr);
          gap: 0.85rem;
        }

        .customer-contact-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .customer-contact-head strong {
          color: var(--color-text);
        }

        .customer-contact-flags {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .customer-contact-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="form-section">
        <div className="form-section-header">
          <h3>Основные данные</h3>
          <p>Имя, тип и фото клиента используются в CRM, ремонте, продажах и проектах.</p>
        </div>

        <div className="customer-form-avatar">
          <div className="customer-form-avatar-preview" aria-hidden="true">
            {avatarPreview ? <img src={avatarPreview} alt="" /> : <UserRound size={38} />}
          </div>
          <div className="customer-form-avatar-actions">
            <label className="customer-form-file">
              <Upload size={18} aria-hidden="true" />
              <span>Загрузить фото</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleImageSelection(file);
                }}
              />
            </label>
            {avatarPreview ? (
              <Button type="button" variant="secondary" onClick={() => form.setValue('avatarUrl', null, { shouldDirty: true, shouldValidate: true })}>
                Удалить фото
              </Button>
            ) : null}
          </div>
        </div>

        <Input
          label="Имя клиента *"
          placeholder="Например: Ахмед Али или ООО «Рафеф»"
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <Select label="Тип клиента" {...form.register('customerType')}>
          <option value="person">Физическое лицо</option>
          <option value="business">Компания</option>
        </Select>
      </section>

      <section className="form-section">
        <div className="form-section-header">
          <h3>Способы связи</h3>
          <p>Добавьте один или несколько способов связи уже на этапе создания клиента.</p>
        </div>

        <div className="customer-contacts-list">
          {contactsFieldArray.fields.map((field, index) => (
            <div className="customer-contact-card" key={field.id}>
              <div className="customer-contact-head">
                <strong>Контакт {index + 1}</strong>
                <Button type="button" variant="secondary" onClick={() => contactsFieldArray.remove(index)}>
                  <Trash2 size={16} aria-hidden="true" />
                  <span>Удалить</span>
                </Button>
              </div>

              <div className="customer-contact-grid">
                <Select label="Тип связи" error={form.formState.errors.contacts?.[index]?.contactType?.message} {...form.register(`contacts.${index}.contactType`)}>
                  <option value="phone">Телефон</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="other">Другое</option>
                </Select>
                <Input
                  label="Значение"
                  placeholder="Введите телефон, email или другой контакт"
                  error={form.formState.errors.contacts?.[index]?.contactValue?.message}
                  {...form.register(`contacts.${index}.contactValue`)}
                />
              </div>

              <div className="customer-contact-flags">
                <Checkbox
                  label="Основной контакт"
                  checked={Boolean(contacts?.[index]?.isPrimary)}
                  onChange={(event) => {
                    form.setValue(`contacts.${index}.isPrimary`, event.target.checked, { shouldDirty: true });
                  }}
                />
                {contactPrimaryLabels[index] ? <small>Используется для главного канала связи этого типа.</small> : null}
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => contactsFieldArray.append({ contactType: 'phone', contactValue: '', isPrimary: contacts.length === 0 })}
        >
          <Plus size={16} aria-hidden="true" />
          <span>Добавить способ связи</span>
        </Button>
      </section>

      <section className="form-section">
        <div className="form-section-header">
          <h3>Заметки</h3>
          <p>Внутренний комментарий для команды магазина.</p>
        </div>
        <Textarea label="Заметки" placeholder="Особенности клиента, предпочтения, важные детали" rows={5} {...form.register('notes')} />
      </section>

      <div className="form-actions">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
        ) : null}
        <Button type="submit" isLoading={isSubmitting}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}
