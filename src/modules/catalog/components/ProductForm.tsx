import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import type { Category, Product, Unit } from '../types/catalog.types';
import { productEditSchema, productFormSchema, type ProductEditValues, type ProductFormValues } from '../validators/catalog.schemas';

type ProductFormProps = {
  product?: Product;
  categories: Category[];
  units: Unit[];
  onSubmit: (values: ProductFormValues | ProductEditValues) => Promise<unknown>;
  isSubmitting?: boolean;
  mode: 'create' | 'edit';
};

export function ProductForm({ product, categories, units, onSubmit, isSubmitting, mode }: ProductFormProps) {
  const { t } = useTranslation(['app', 'common']);
  const schema = mode === 'create' ? productFormSchema : productEditSchema;
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<ProductFormValues>,
    defaultValues: {
      categoryId: product?.category_id ?? categories[0]?.id ?? 0,
      unitId: product?.unit_id ?? units[0]?.id ?? 0,
      sku: product?.sku ?? '',
      defaultName: product?.default_name_original ?? product?.default_name ?? '',
      trackingType: product?.tracking_type ?? 'quantity',
      currentPurchasePrice: Number(product?.current_purchase_price ?? 0),
      currentSalePrice: Number(product?.current_sale_price ?? 0),
      reorderThreshold: Number(product?.reorder_threshold ?? 0),
      barcode: '',
    },
  });

  return (
    <form className="entity-form" onSubmit={form.handleSubmit((values) => onSubmit(values as ProductFormValues | ProductEditValues))}>
      <Input label="SKU" error={form.formState.errors.sku?.message} {...form.register('sku')} />
      <Input label={t('catalog.form.nameLabel', { ns: 'app' })} error={form.formState.errors.defaultName?.message} {...form.register('defaultName')} />
      <Select label={t('catalog.form.categoryLabel', { ns: 'app' })} {...form.register('categoryId')}>
        {categories.map((category) => (
          <option value={category.id} key={category.id}>
            {category.default_name}
          </option>
        ))}
      </Select>
      <Select label={t('catalog.form.unitLabel', { ns: 'app' })} {...form.register('unitId')}>
        {units.map((unit) => (
          <option value={unit.id} key={unit.id}>
            {unit.name_ru}
          </option>
        ))}
      </Select>
      <Select label={t('catalog.form.trackingLabel', { ns: 'app' })} {...form.register('trackingType')}>
        <option value="quantity">{t('catalog.form.trackingTypes.quantity', { ns: 'app' })}</option>
        <option value="serial">{t('catalog.form.trackingTypes.serial', { ns: 'app' })}</option>
        <option value="batch">{t('catalog.form.trackingTypes.batch', { ns: 'app' })}</option>
      </Select>
      <Input
        label={t('catalog.form.purchasePriceLabel', { ns: 'app' })}
        type="number"
        step="0.01"
        error={form.formState.errors.currentPurchasePrice?.message}
        {...form.register('currentPurchasePrice')}
      />
      <Input
        label={t('catalog.form.salePriceLabel', { ns: 'app' })}
        type="number"
        step="0.01"
        error={form.formState.errors.currentSalePrice?.message}
        {...form.register('currentSalePrice')}
      />
      <Input
        label={t('catalog.form.reorderThresholdLabel', { ns: 'app' })}
        type="number"
        step="0.01"
        error={form.formState.errors.reorderThreshold?.message}
        {...form.register('reorderThreshold')}
      />
      {mode === 'create' ? <Input label={t('catalog.form.barcodeLabel', { ns: 'app' })} {...form.register('barcode')} /> : null}
      <Button type="submit" isLoading={isSubmitting}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
