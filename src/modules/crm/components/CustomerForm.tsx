import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../../../shared/ui/Button';
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

export function CustomerForm({ customer, onSubmit, onCancel, isSubmitting }: CustomerFormProps) {
  const form = useForm({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name ?? '',
      phonePrimary: customer?.phone_primary ?? '',
      phoneSecondary: customer?.phone_secondary ?? '',
      email: customer?.email ?? '',
      customerType: customer?.customer_type ?? 'person',
      notes: customer?.notes ?? '',
    },
  });

  return (
    <form className="entity-form customer-create-form" onSubmit={form.handleSubmit((values) => onSubmit(values as CustomerFormValues))}>
      <section className="form-section">
        <div className="form-section-header">
          <h3>Основные данные</h3>
          <p>Имя и тип клиента используются в CRM, ремонте, продажах и проектах.</p>
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
          <h3>Контакты</h3>
          <p>Поддерживаются основные поля текущего API создания клиента.</p>
        </div>
        <Input label="Основной телефон" placeholder="+20 ..." autoComplete="tel" {...form.register('phonePrimary')} />
        <Input label="Дополнительный телефон" placeholder="Резервный номер" autoComplete="tel" {...form.register('phoneSecondary')} />
        <Input
          label="Email"
          placeholder="client@example.com"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
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
