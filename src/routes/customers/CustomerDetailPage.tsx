import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, MapPin, Phone, Snowflake, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { crmApi } from '../../modules/crm/api/crm.api';
import { CustomerForm } from '../../modules/crm/components/CustomerForm';
import type { Customer } from '../../modules/crm/types/crm.types';
import {
  contactFormSchema,
  locationFormSchema,
  noteFormSchema,
  type ContactFormValues,
  type CustomerFormValues,
  type LocationFormValues,
  type NoteFormValues,
} from '../../modules/crm/validators/customer.schemas';
import { httpClient } from '../../shared/api/httpClient';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import { Button } from '../../shared/ui/Button';
import { Checkbox } from '../../shared/ui/Checkbox';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

type CustomerDetail = Customer & Required<Pick<Customer, 'contacts' | 'locations' | 'notesHistory'>>;
type DrawerMode = 'edit' | 'contact' | 'location' | 'note' | null;

function getCustomerInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'RT';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('').slice(0, 2);
}

export function CustomerDetailPage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
  const { id } = useParams();
  const customerId = Number(id);
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const customerQuery = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: async () => {
      const response = await httpClient.get<{ customer: CustomerDetail }>(`/api/customers/${customerId}`);
      return {
        ...response.customer,
        contacts: response.customer.contacts ?? [],
        locations: response.customer.locations ?? [],
        notesHistory: response.customer.notesHistory ?? [],
      } as CustomerDetail;
    },
    enabled: Number.isFinite(customerId),
  });

  const updateMutation = useMutation({
    mutationFn: (values: CustomerFormValues) => crmApi.updateCustomer(customerId, values),
    onSuccess: async () => {
      setDrawer(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] }),
      ]);
    },
  });

  const toggleFreezeMutation = useMutation({
    mutationFn: (isFrozen: boolean) => httpClient.patch<{ customer: Customer }>(`/api/customers/${customerId}`, { isFrozen }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => httpClient.delete<void>(`/api/customers/${customerId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers', { replace: true });
    },
  });

  const contactMutation = useMutation({
    mutationFn: (values: ContactFormValues) => crmApi.addContact(customerId, values),
    onSuccess: async () => {
      setDrawer(null);
      await queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] });
    },
  });

  const locationMutation = useMutation({
    mutationFn: (values: LocationFormValues) => crmApi.addLocation(customerId, values),
    onSuccess: async () => {
      setDrawer(null);
      await queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: (values: NoteFormValues) => crmApi.addNote(customerId, values),
    onSuccess: async () => {
      setDrawer(null);
      await queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] });
    },
  });

  const customer = customerQuery.data;
  const customerInitials = customer ? getCustomerInitials(customer.name) : 'RT';

  const customerTypeLabel = (type: Customer['customer_type']) => (type === 'business' ? t('customers.business', { ns: 'app' }) : t('customers.individual', { ns: 'app' }));
  const contactTypeLabel = (type: string) => t(`customers.form.contactTypes.${['phone', 'email', 'whatsapp', 'telegram'].includes(type) ? type : 'other'}`, { ns: 'app' });
  const locationTypeLabel = (type: string) => t(`customers.locationTypes.${['home', 'school', 'company', 'store', 'factory', 'hospital'].includes(type) ? type : 'other'}`, { ns: 'app' });

  return (
    <>
      <style>{`
        .customer-detail-shell {
          display: grid;
          gap: 1rem;
        }

        .customer-detail-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .customer-back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          border: 1px solid rgb(8 120 215 / 18%);
          border-radius: 18px;
          background: linear-gradient(145deg, rgb(255 255 255 / 90%), rgb(241 249 255 / 78%));
          color: var(--color-primary-strong);
          box-shadow: 0 12px 24px rgb(46 103 153 / 10%);
          padding: 0.78rem 1rem;
          text-decoration: none;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .customer-back-link:hover {
          background: #fff;
          box-shadow: 0 16px 28px rgb(46 103 153 / 14%);
          transform: translateY(-1px);
        }

        .customer-profile-card {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 1.1rem;
          align-items: center;
          border: 1px solid var(--tech-border);
          border-radius: 28px;
          background: linear-gradient(145deg, rgb(255 255 255 / 88%), rgb(241 249 255 / 74%));
          box-shadow: 0 18px 44px rgb(46 103 153 / 12%);
          padding: 1.15rem;
          overflow: hidden;
          backdrop-filter: blur(18px);
        }

        .customer-profile-card::before {
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, rgb(66 165 255 / 14%), transparent 42%);
          content: "";
          pointer-events: none;
        }

        .customer-profile-avatar {
          position: relative;
          z-index: 1;
          width: 108px;
          height: 108px;
          border-radius: 50%;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 32% 22%, rgb(255 255 255 / 95%), transparent 34%),
            linear-gradient(145deg, #ffffff, #eaf7ff 72%, #dff1ff);
          color: var(--color-primary-strong);
          border: 2px solid rgb(87 174 245 / 42%);
          box-shadow:
            0 0 0 5px rgb(255 255 255 / 66%),
            0 14px 30px rgb(46 103 153 / 16%),
            0 0 24px rgb(66 165 255 / 22%),
            inset 0 1px 0 rgb(255 255 255 / 86%);
          font-size: 1.9rem;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .customer-profile-avatar img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .customer-profile-avatar-fallback {
          position: relative;
          z-index: 0;
        }

        .customer-profile-status {
          position: absolute;
          right: 10px;
          bottom: 12px;
          z-index: 2;
          width: 16px;
          height: 16px;
          border: 3px solid #fff;
          border-radius: 50%;
          background: #2fd182;
          box-shadow: 0 0 14px rgb(47 209 130 / 72%);
        }

        .customer-profile-status.is-frozen {
          background: #5ca9ff;
          box-shadow: 0 0 14px rgb(92 169 255 / 78%);
        }

        .customer-profile-copy {
          position: relative;
          z-index: 1;
          display: grid;
          min-width: 0;
          gap: 0.45rem;
        }

        .customer-profile-copy .eyebrow {
          margin: 0;
          color: var(--color-primary-strong);
        }

        .customer-profile-name {
          display: grid;
          gap: 0.2rem;
          min-width: 0;
        }

        .customer-profile-name strong {
          color: var(--color-text);
          font-size: clamp(1.2rem, 1rem + 0.6vw, 1.8rem);
          line-height: 1.08;
          word-break: break-word;
        }

        .customer-profile-subtitle {
          color: var(--color-text-muted);
          font-weight: 700;
        }

        .customer-profile-tags {
          display: flex;
          gap: 0.55rem;
          flex-wrap: wrap;
        }

        .customer-meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: 1px solid rgb(8 120 215 / 18%);
          border-radius: 999px;
          background: rgb(255 255 255 / 72%);
          color: var(--color-primary-strong);
          font-size: 0.8rem;
          font-weight: 800;
          padding: 0.38rem 0.72rem;
        }

        .customer-profile-note {
          color: var(--color-text-muted);
          line-height: 1.55;
          margin: 0;
        }

        .customer-profile-cta {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 0.55rem;
          justify-items: end;
        }

        .customer-profile-cta-label {
          display: inline-flex;
          align-items: center;
          gap: 0.42rem;
          border: 1px solid rgb(102 173 230 / 18%);
          border-radius: 14px;
          background: rgb(255 255 255 / 56%);
          color: var(--color-text-muted);
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.45rem 0.65rem;
        }

        .customer-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .customer-info-card,
        .customer-list-card {
          display: grid;
          gap: 0.85rem;
          padding: 1.1rem;
          border: 1px solid rgba(125, 211, 252, 0.24);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.72);
        }

        .customer-inline-list {
          display: grid;
          gap: 0.75rem;
        }

        .customer-inline-item {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.8rem 0.95rem;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(125, 211, 252, 0.2);
        }

        .customer-inline-item strong {
          display: inline-block;
          margin-bottom: 0.2rem;
        }

        .customer-actions-grid {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .customer-note-time {
          color: var(--color-text-muted);
          font-size: 0.86rem;
        }

        @media (max-width: 980px) {
          .customer-profile-card {
            grid-template-columns: 1fr;
            justify-items: start;
          }

          .customer-profile-cta {
            justify-items: start;
          }
        }

        @media (max-width: 820px) {
          .customer-info-grid {
            grid-template-columns: 1fr;
          }

          .customer-profile-avatar {
            width: 92px;
            height: 92px;
            font-size: 1.55rem;
          }
        }
      `}</style>

      <div className="customer-detail-topbar">
        <header className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <p className="eyebrow">{t('customers.module', { ns: 'app' })}</p>
            <h1>{customer?.name ?? t('customers.detail.fallbackName', { ns: 'app' })}</h1>
          </div>
        </header>

        <Link className="customer-back-link" to="/customers" aria-label={t('customers.detail.backToList', { ns: 'app' })}>
          <ArrowLeft size={18} aria-hidden="true" />
          <span>{t('customers.detail.backToList', { ns: 'app' })}</span>
        </Link>
      </div>

      {customerQuery.isLoading ? <section className="panel">{t('customers.detail.loading', { ns: 'app' })}</section> : null}
      {customerQuery.isError ? <section className="panel">{t('customers.detail.error', { ns: 'app' })}</section> : null}

      {customer ? (
        <section className="customer-detail-shell">
          <article className="customer-profile-card">
            <div className="customer-profile-avatar" aria-hidden="true">
              {customer.avatar_url ? <img src={customer.avatar_url} alt="" /> : <span className="customer-profile-avatar-fallback">{customerInitials}</span>}
              <span className={`customer-profile-status${customer.is_frozen ? ' is-frozen' : ''}`} />
            </div>

            <div className="customer-profile-copy">
              <p className="eyebrow">{t('customers.detail.cardEyebrow', { ns: 'app' })}</p>
              <div className="customer-profile-name">
                <strong>{customer.name}</strong>
                <span className="customer-profile-subtitle">
                  {customerTypeLabel(customer.customer_type)} · {t('customers.code', { ns: 'app' })} {customer.customer_code}
                </span>
              </div>

              <div className="customer-profile-tags">
                <span className="customer-meta-pill">{customerTypeLabel(customer.customer_type)}</span>
                <span className="customer-meta-pill">{customer.is_frozen ? t('customers.frozen', { ns: 'app' }) : t('customers.detail.active', { ns: 'app' })}</span>
                {customer.phone_primary ? <span className="customer-meta-pill">{customer.phone_primary}</span> : null}
              </div>

              <p className="customer-profile-note">{customer.notes || t('customers.detail.avatarFallbackNote', { ns: 'app' })}</p>
            </div>

            <div className="customer-profile-cta">
              <span className="customer-profile-cta-label">
                <Snowflake size={14} aria-hidden="true" />
                <span>{customer.is_frozen ? t('customers.detail.accountFrozen', { ns: 'app' }) : t('customers.detail.accountActive', { ns: 'app' })}</span>
              </span>
            </div>
          </article>

          <section className="customer-actions-grid">
            <PermissionGate permission="crm.customers.update">
              <Button onClick={() => setDrawer('edit')}>{t('customers.detail.edit', { ns: 'app' })}</Button>
              <Button
                variant="secondary"
                onClick={() => toggleFreezeMutation.mutate(!Boolean(customer.is_frozen))}
                isLoading={toggleFreezeMutation.isPending}
              >
                {customer.is_frozen ? t('customers.detail.unfreeze', { ns: 'app' }) : t('customers.detail.freeze', { ns: 'app' })}
              </Button>
              <Button variant="secondary" onClick={() => setDrawer('contact')}>
                {t('customers.detail.addContact', { ns: 'app' })}
              </Button>
              <Button variant="secondary" onClick={() => setDrawer('location')}>
                {t('customers.detail.addLocation', { ns: 'app' })}
              </Button>
            </PermissionGate>
            <PermissionGate permission="crm.customers.notes.manage">
              <Button variant="secondary" onClick={() => setDrawer('note')}>
                {t('customers.detail.addNote', { ns: 'app' })}
              </Button>
            </PermissionGate>
            <PermissionGate permission="crm.customers.update">
              <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                <Trash2 size={16} aria-hidden="true" />
                <span>{t('customers.detail.delete', { ns: 'app' })}</span>
              </Button>
            </PermissionGate>
          </section>

          <section className="customer-info-grid">
            <article className="customer-info-card">
              <h3>{t('customers.detail.overview', { ns: 'app' })}</h3>
              <p>
                <strong>{t('customers.phone', { ns: 'app' })}:</strong> {customer.phone_primary || '-'}
              </p>
              <p>
                <strong>{t('customers.detail.secondaryPhone', { ns: 'app' })}:</strong> {customer.phone_secondary || '-'}
              </p>
              <p>
                <strong>{t('customers.email', { ns: 'app' })}:</strong> {customer.email || '-'}
              </p>
              <p>
                <strong>{t('customers.detail.createdAt', { ns: 'app' })}:</strong> {new Date(customer.created_at).toLocaleString(locale)}
              </p>
              <p>
                <strong>{t('customers.detail.updatedAt', { ns: 'app' })}:</strong> {new Date(customer.updated_at).toLocaleString(locale)}
              </p>
            </article>

            <article className="customer-info-card">
              <h3>{t('customers.detail.contacts', { ns: 'app' })}</h3>
              <div className="customer-inline-list">
                {customer.contacts.length > 0 ? (
                  customer.contacts.map((contact) => (
                    <div className="customer-inline-item" key={contact.id}>
                      {contact.contact_type === 'email' ? <Mail size={18} aria-hidden="true" /> : <Phone size={18} aria-hidden="true" />}
                      <div>
                        <strong>{contactTypeLabel(contact.contact_type)}</strong>
                        <div>{contact.contact_value}</div>
                        {contact.is_primary ? <small>{t('customers.detail.primaryContact', { ns: 'app' })}</small> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>{t('customers.detail.contactsEmpty', { ns: 'app' })}</p>
                )}
              </div>
            </article>
          </section>

          <section className="customer-info-grid">
            <article className="customer-list-card">
              <h3>{t('customers.detail.locations', { ns: 'app' })}</h3>
              <div className="customer-inline-list">
                {customer.locations.length > 0 ? (
                  customer.locations.map((location) => (
                    <div className="customer-inline-item" key={location.id}>
                      <MapPin size={18} aria-hidden="true" />
                      <div>
                        <strong>{location.name}</strong>
                        <div>{location.address_text || t('customers.detail.addressMissing', { ns: 'app' })}</div>
                        <small>{locationTypeLabel(location.location_type)}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>{t('customers.detail.locationsEmpty', { ns: 'app' })}</p>
                )}
              </div>
            </article>

            <article className="customer-list-card">
              <h3>{t('customers.detail.notesHistory', { ns: 'app' })}</h3>
              <div className="customer-inline-list">
                {customer.notesHistory.length > 0 ? (
                  customer.notesHistory.map((note) => (
                    <div className="customer-inline-item" key={note.id}>
                      <div>
                        <div>{note.note_text}</div>
                        <div className="customer-note-time">{new Date(note.created_at).toLocaleString(locale)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>{t('customers.detail.notesEmpty', { ns: 'app' })}</p>
                )}
              </div>
            </article>
          </section>
        </section>
      ) : null}

      <FormDrawer title={t('customers.detail.editTitle', { ns: 'app' })} isOpen={drawer === 'edit'} onClose={() => setDrawer(null)}>
        {customer ? <CustomerForm customer={customer} onSubmit={(values) => updateMutation.mutateAsync(values)} isSubmitting={updateMutation.isPending} /> : null}
      </FormDrawer>

      <FormDrawer title={t('customers.detail.newContactTitle', { ns: 'app' })} isOpen={drawer === 'contact'} onClose={() => setDrawer(null)}>
        <ContactForm onSubmit={(values) => contactMutation.mutateAsync(values)} isSubmitting={contactMutation.isPending} />
      </FormDrawer>

      <FormDrawer title={t('customers.detail.newLocationTitle', { ns: 'app' })} isOpen={drawer === 'location'} onClose={() => setDrawer(null)}>
        <LocationForm onSubmit={(values) => locationMutation.mutateAsync(values)} isSubmitting={locationMutation.isPending} />
      </FormDrawer>

      <FormDrawer title={t('customers.detail.newNoteTitle', { ns: 'app' })} isOpen={drawer === 'note'} onClose={() => setDrawer(null)}>
        <NoteForm onSubmit={(values) => noteMutation.mutateAsync(values)} isSubmitting={noteMutation.isPending} />
      </FormDrawer>

      <ConfirmDialog
        title={t('customers.detail.deleteTitle', { ns: 'app' })}
        message={t('customers.detail.deleteMessage', { ns: 'app', name: customer?.name ?? '' })}
        isOpen={isDeleteOpen}
        confirmLabel={t('customers.detail.delete', { ns: 'app' })}
        cancelLabel={t('common:actions.cancel')}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}

function ContactForm({ onSubmit, isSubmitting }: { onSubmit: (values: ContactFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const { t } = useTranslation(['app', 'common']);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { contactType: 'phone', contactValue: '', isPrimary: false },
  });

  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
      <Select label={t('customers.form.contactTypeLabel', { ns: 'app' })} {...form.register('contactType')}>
        <option value="phone">{t('customers.form.contactTypes.phone', { ns: 'app' })}</option>
        <option value="email">{t('customers.form.contactTypes.email', { ns: 'app' })}</option>
        <option value="whatsapp">{t('customers.form.contactTypes.whatsapp', { ns: 'app' })}</option>
        <option value="telegram">{t('customers.form.contactTypes.telegram', { ns: 'app' })}</option>
        <option value="other">{t('customers.form.contactTypes.other', { ns: 'app' })}</option>
      </Select>
      <Input label={t('customers.form.contactValueLabel', { ns: 'app' })} error={form.formState.errors.contactValue?.message} {...form.register('contactValue')} />
      <Checkbox label={t('customers.form.primaryContact', { ns: 'app' })} {...form.register('isPrimary')} />
      <Button type="submit" isLoading={isSubmitting}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}

function LocationForm({ onSubmit, isSubmitting }: { onSubmit: (values: LocationFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const { t } = useTranslation(['app', 'common']);
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema) as unknown as Resolver<LocationFormValues>,
    defaultValues: { name: '', locationType: 'other', addressText: '', mapUrl: '', notes: '' },
  });

  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
      <Input label={t('customers.detail.locationName', { ns: 'app' })} error={form.formState.errors.name?.message} {...form.register('name')} />
      <Select label={t('customers.form.typeLabel', { ns: 'app' })} {...form.register('locationType')}>
        <option value="home">{t('customers.locationTypes.home', { ns: 'app' })}</option>
        <option value="school">{t('customers.locationTypes.school', { ns: 'app' })}</option>
        <option value="company">{t('customers.locationTypes.company', { ns: 'app' })}</option>
        <option value="store">{t('customers.locationTypes.store', { ns: 'app' })}</option>
        <option value="factory">{t('customers.locationTypes.factory', { ns: 'app' })}</option>
        <option value="hospital">{t('customers.locationTypes.hospital', { ns: 'app' })}</option>
        <option value="other">{t('customers.locationTypes.other', { ns: 'app' })}</option>
      </Select>
      <Textarea label={t('customers.detail.addressLabel', { ns: 'app' })} {...form.register('addressText')} />
      <Input label={t('customers.detail.mapUrl', { ns: 'app' })} {...form.register('mapUrl')} />
      <Textarea label={t('customers.notes', { ns: 'app' })} {...form.register('notes')} />
      <Button type="submit" isLoading={isSubmitting}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}

function NoteForm({ onSubmit, isSubmitting }: { onSubmit: (values: NoteFormValues) => Promise<unknown>; isSubmitting: boolean }) {
  const { t } = useTranslation(['app', 'common']);
  const form = useForm<NoteFormValues>({ resolver: zodResolver(noteFormSchema), defaultValues: { noteText: '' } });

  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
      <Textarea label={t('customers.notes', { ns: 'app' })} error={form.formState.errors.noteText?.message} {...form.register('noteText')} />
      <Button type="submit" isLoading={isSubmitting}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
