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
  isSubmitting?: boolean;
};

export function CustomerForm({ customer, onSubmit, isSubmitting }: CustomerFormProps) {
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
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as CustomerFormValues))}>
      <Input label="Имя клиента" error={form.formState.errors.name?.message} {...form.register('name')} />
      <Select label="Тип клиента" {...form.register('customerType')}>
        <option value="person">Физическое лицо</option>
        <option value="business">Компания</option>
      </Select>
      <Input label="Основной телефон" {...form.register('phonePrimary')} />
      <Input label="Дополнительный телефон" {...form.register('phoneSecondary')} />
      <Input label="Email" {...form.register('email')} />
      <Textarea label="Заметки" {...form.register('notes')} />
      <Button type="submit" isLoading={isSubmitting}>
        Сохранить
      </Button>
    </form>
  );
}
