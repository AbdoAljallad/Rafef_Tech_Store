import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Upload, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { Textarea } from '../../../shared/ui/Textarea';
import type { Customer } from '../types/crm.types';
import { customerFormSchema, type CustomerFormValues } from '../validators/customer.schemas';

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
  const { t } = useTranslation(['app', 'common']);
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema) as unknown as Resolver<CustomerFormValues>,
    defaultValues: {
      name: customer?.name_original ?? customer?.name ?? '',
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

    const imageData = await resizeImageForAvatar(file, t('customers.form.fileReadError', { ns: 'app' }));

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
          <h3>{t('customers.form.basicTitle', { ns: 'app' })}</h3>
          <p>{t('customers.form.basicText', { ns: 'app' })}</p>
        </div>

        <div className="customer-form-avatar">
          <div className="customer-form-avatar-preview" aria-hidden="true">
            {avatarPreview ? <img src={avatarPreview} alt="" /> : <UserRound size={38} />}
          </div>
          <div className="customer-form-avatar-actions">
            <label className="customer-form-file">
              <Upload size={18} aria-hidden="true" />
              <span>{t('customers.form.uploadPhoto', { ns: 'app' })}</span>
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
                {t('customers.form.removePhoto', { ns: 'app' })}
              </Button>
            ) : null}
          </div>
        </div>

        <Input
          label={t('customers.form.nameLabel', { ns: 'app' })}
          placeholder={t('customers.form.namePlaceholder', { ns: 'app' })}
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <Select label={t('customers.form.typeLabel', { ns: 'app' })} {...form.register('customerType')}>
          <option value="person">{t('customers.form.types.person', { ns: 'app' })}</option>
          <option value="business">{t('customers.form.types.business', { ns: 'app' })}</option>
        </Select>
      </section>

      <section className="form-section">
        <div className="form-section-header">
          <h3>{t('customers.form.contactsTitle', { ns: 'app' })}</h3>
          <p>{t('customers.form.contactsText', { ns: 'app' })}</p>
        </div>

        <div className="customer-contacts-list">
          {contactsFieldArray.fields.map((field, index) => (
            <div className="customer-contact-card" key={field.id}>
              <div className="customer-contact-head">
                <strong>{t('customers.form.contactItem', { ns: 'app', index: index + 1 })}</strong>
                <Button type="button" variant="secondary" onClick={() => contactsFieldArray.remove(index)}>
                  <Trash2 size={16} aria-hidden="true" />
                  <span>{t('customers.form.removeContact', { ns: 'app' })}</span>
                </Button>
              </div>

              <div className="customer-contact-grid">
                <Select
                  label={t('customers.form.contactTypeLabel', { ns: 'app' })}
                  error={form.formState.errors.contacts?.[index]?.contactType?.message}
                  {...form.register(`contacts.${index}.contactType`)}
                >
                  <option value="phone">{t('customers.form.contactTypes.phone', { ns: 'app' })}</option>
                  <option value="email">{t('customers.form.contactTypes.email', { ns: 'app' })}</option>
                  <option value="whatsapp">{t('customers.form.contactTypes.whatsapp', { ns: 'app' })}</option>
                  <option value="telegram">{t('customers.form.contactTypes.telegram', { ns: 'app' })}</option>
                  <option value="other">{t('customers.form.contactTypes.other', { ns: 'app' })}</option>
                </Select>
                <Input
                  label={t('customers.form.contactValueLabel', { ns: 'app' })}
                  placeholder={t('customers.form.contactValuePlaceholder', { ns: 'app' })}
                  error={form.formState.errors.contacts?.[index]?.contactValue?.message}
                  {...form.register(`contacts.${index}.contactValue`)}
                />
              </div>

              <div className="customer-contact-flags">
                <Checkbox
                  label={t('customers.form.primaryContact', { ns: 'app' })}
                  checked={Boolean(contacts?.[index]?.isPrimary)}
                  onChange={(event) => {
                    form.setValue(`contacts.${index}.isPrimary`, event.target.checked, { shouldDirty: true });
                  }}
                />
                {contactPrimaryLabels[index] ? <small>{t('customers.form.primaryHint', { ns: 'app' })}</small> : null}
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
          <span>{t('customers.form.addContact', { ns: 'app' })}</span>
        </Button>
      </section>

      <section className="form-section">
        <div className="form-section-header">
          <h3>{t('customers.form.notesTitle', { ns: 'app' })}</h3>
          <p>{t('customers.form.notesText', { ns: 'app' })}</p>
        </div>
        <Textarea
          label={t('customers.form.notesLabel', { ns: 'app' })}
          placeholder={t('customers.form.notesPlaceholder', { ns: 'app' })}
          rows={5}
          {...form.register('notes')}
        />
      </section>

      <div className="form-actions">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('common:actions.cancel')}
          </Button>
        ) : null}
        <Button type="submit" isLoading={isSubmitting}>
          {t('common:actions.save')}
        </Button>
      </div>
    </form>
  );
}

async function resizeImageForAvatar(file: File, errorMessage: string) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(errorMessage));
      element.src = objectUrl;
    });

    const maxSide = 512;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error(errorMessage);
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
