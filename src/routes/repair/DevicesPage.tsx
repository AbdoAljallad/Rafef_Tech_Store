import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cpu, Layers3, Plus, Smartphone, Tags, UserRoundSearch } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../../modules/crm/api/crm.api';
import { repairApi } from '../../modules/repair/api/repair.api';
import { ErrorState } from '../../shared/components/ErrorState/ErrorState';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';

function resolveLocale(language?: string) {
  return language?.startsWith('ar') ? 'ar' : 'ru';
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

type CategoryFormValues = {
  code: string;
  nameRu: string;
};

type BrandFormValues = {
  name: string;
};

type ModelFormValues = {
  categoryId: string;
  brandId: string;
  name: string;
};

type DeviceFormValues = {
  customerId: string;
  categoryId: string;
  brandId: string;
  modelId: string;
  deviceName: string;
};

export function DevicesPage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = resolveLocale(i18n.resolvedLanguage);
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const categories = useQuery({ queryKey: ['repairCategories'], queryFn: repairApi.listCategories });
  const brands = useQuery({ queryKey: ['repairBrands'], queryFn: repairApi.listBrands });
  const models = useQuery({ queryKey: ['repairModels'], queryFn: repairApi.listModels });
  const customersQuery = useQuery({
    queryKey: ['customers', 'repair-devices', customerSearch],
    queryFn: () => crmApi.listCustomers(customerSearch, { pageSize: 20 }),
  });

  const catForm = useForm<CategoryFormValues>({ defaultValues: { code: '', nameRu: '' } });
  const brandForm = useForm<BrandFormValues>({ defaultValues: { name: '' } });
  const modelForm = useForm<ModelFormValues>({ defaultValues: { categoryId: '', brandId: '', name: '' } });
  const deviceForm = useForm<DeviceFormValues>({ defaultValues: { customerId: '', categoryId: '', brandId: '', modelId: '', deviceName: '' } });

  const createCategory = useMutation({
    mutationFn: repairApi.createCategory,
    onSuccess: async () => {
      catForm.reset();
      await queryClient.invalidateQueries({ queryKey: ['repairCategories'] });
    },
  });
  const createBrand = useMutation({
    mutationFn: repairApi.createBrand,
    onSuccess: async () => {
      brandForm.reset();
      await queryClient.invalidateQueries({ queryKey: ['repairBrands'] });
    },
  });
  const createModel = useMutation({
    mutationFn: repairApi.createModel,
    onSuccess: async () => {
      modelForm.reset();
      await queryClient.invalidateQueries({ queryKey: ['repairModels'] });
    },
  });
  const createDevice = useMutation({
    mutationFn: repairApi.createDevice,
    onSuccess: async (_response, payload) => {
      deviceForm.reset({
        customerId: String(payload.customerId),
        categoryId: '',
        brandId: '',
        modelId: '',
        deviceName: '',
      });
      await queryClient.invalidateQueries({ queryKey: ['repairCustomerDevices'] });
    },
  });

  const itemsCategories = categories.data?.items ?? [];
  const itemsBrands = brands.data?.items ?? [];
  const itemsModels = models.data?.items ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredCategories = itemsCategories.filter((category) => {
    if (!normalizedSearch) {
      return true;
    }

    return [category.code, category.name_ru].some((value) => value.toLowerCase().includes(normalizedSearch));
  });
  const filteredBrands = itemsBrands.filter((brand) => {
    if (!normalizedSearch) {
      return true;
    }

    return brand.name.toLowerCase().includes(normalizedSearch);
  });
  const filteredModels = itemsModels.filter((model) => {
    if (!normalizedSearch) {
      return true;
    }

    return [model.name, model.category_name_ru ?? '', model.brand_name ?? '']
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  const selectedCustomerId = deviceForm.watch('customerId');
  const selectedCategoryIdForModel = modelForm.watch('categoryId');
  const selectedBrandIdForModel = modelForm.watch('brandId');
  const selectedCategoryIdForDevice = deviceForm.watch('categoryId');
  const selectedBrandIdForDevice = deviceForm.watch('brandId');

  const customerDevicesQuery = useQuery({
    queryKey: ['repairCustomerDevices', selectedCustomerId],
    queryFn: () => repairApi.listCustomerDevices(Number(selectedCustomerId)),
    enabled: Number(selectedCustomerId) > 0,
  });
  const modelsForDevice = itemsModels.filter((model) => {
    if (selectedCategoryIdForDevice && String(model.category_id) !== selectedCategoryIdForDevice) {
      return false;
    }

    if (selectedBrandIdForDevice && String(model.brand_id) !== selectedBrandIdForDevice) {
      return false;
    }

    return true;
  });
  const selectedCustomer = (customersQuery.data?.items ?? []).find((customer) => String(customer.id) === selectedCustomerId) ?? null;
  const hasDirectoryError = categories.isError || brands.isError || models.isError;

  return (
    <div className="ops-dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('repair.module', { ns: 'app' })}</p>
          <h1>{t('repair.devicesTitle', { ns: 'app' })}</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={<Smartphone size={18} />} onClick={() => navigate('/repair/orders')}>
            {t('repair.module', { ns: 'app' })}
          </Button>
        </div>
      </header>

      <section className="panel ops-hero">
        <div className="ops-hero-copy">
          <h2>{t('repair.devicesTitle', { ns: 'app' })}</h2>
          <p className="muted">{t('repair.devicesPage.hubDescription', { ns: 'app' })}</p>
        </div>
        <div className="ops-inline-pills">
          <Badge tone="info">{t('repair.devicesPage.summary.totalDirectories', { ns: 'app' })}</Badge>
          {selectedCustomer ? <Badge tone="neutral">{selectedCustomer.name}</Badge> : null}
        </div>
      </section>

      <section className="ops-summary-grid">
        <article className="panel ops-summary-card">
          <Layers3 size={20} />
          <strong>{itemsCategories.length}</strong>
          <span>{t('repair.devicesPage.summary.categories', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <Tags size={20} />
          <strong>{itemsBrands.length}</strong>
          <span>{t('repair.devicesPage.summary.brands', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <Cpu size={20} />
          <strong>{itemsModels.length}</strong>
          <span>{t('repair.devicesPage.summary.models', { ns: 'app' })}</span>
        </article>
        <article className="panel ops-summary-card">
          <UserRoundSearch size={20} />
          <strong>{customerDevicesQuery.data?.items.length ?? 0}</strong>
          <span>{t('repair.devicesPage.summary.customerDevices', { ns: 'app' })}</span>
        </article>
      </section>

      <section className="panel ops-panel">
        <div className="ops-panel-header">
          <div className="entity-toolbar-copy">
            <h2>{t('repair.devicesPage.directoryTitle', { ns: 'app' })}</h2>
            <p className="muted">{t('repair.devicesPage.directoryDescription', { ns: 'app' })}</p>
          </div>
        </div>

        <div className="ops-filter-grid">
          <div className="ops-filter-search">
            <span>{t('repair.devicesPage.directorySearchLabel', { ns: 'app' })}</span>
            <SearchInput
              aria-label={t('repair.devicesPage.directorySearchLabel', { ns: 'app' })}
              placeholder={t('repair.devicesPage.directorySearchPlaceholder', { ns: 'app' })}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {hasDirectoryError ? <ErrorState title={t('errors.routeErrorTitle', { ns: 'common' })} description={t('repair.devicesPage.loadFailed', { ns: 'app' })} /> : null}

        <div className="ops-directory-grid">
          <article className="ops-directory-card">
            <div className="detail-stack">
              <h2>{t('repair.devicesPage.categoriesTitle', { ns: 'app' })}</h2>
              <p className="muted">{t('repair.devicesPage.categoryHelp', { ns: 'app' })}</p>
            </div>
            <DataTable
              rows={filteredCategories}
              isLoading={categories.isLoading}
              emptyText={search ? t('repair.devicesPage.noFilteredCategories', { ns: 'app' }) : t('repair.devicesPage.noCategories', { ns: 'app' })}
              getRowKey={(category) => category.id}
              columns={[
                { key: 'code', header: t('repair.devicesPage.categoryCode', { ns: 'app' }), render: (category) => <Badge tone="info">{category.code}</Badge> },
                { key: 'name', header: t('repair.devicesPage.categoryName', { ns: 'app' }), render: (category) => category.name_ru },
              ]}
            />
            <form
              className="entity-form"
              onSubmit={catForm.handleSubmit(async (values) => {
                if (!values.code.trim() || !values.nameRu.trim()) {
                  return;
                }

                await createCategory.mutateAsync({ code: values.code.trim().toUpperCase(), nameRu: values.nameRu.trim() });
              })}
            >
              <div className="ops-form-grid">
                <Input label={t('repair.devicesPage.categoryCode', { ns: 'app' })} {...catForm.register('code')} />
                <Input label={t('repair.devicesPage.categoryName', { ns: 'app' })} {...catForm.register('nameRu')} />
              </div>
              <Button type="submit" icon={<Plus size={18} />} isLoading={createCategory.isPending}>
                {t('repair.devicesPage.createCategory', { ns: 'app' })}
              </Button>
            </form>
          </article>

          <article className="ops-directory-card">
            <div className="detail-stack">
              <h2>{t('repair.devicesPage.brandsTitle', { ns: 'app' })}</h2>
              <p className="muted">{t('repair.devicesPage.brandHelp', { ns: 'app' })}</p>
            </div>
            <DataTable
              rows={filteredBrands}
              isLoading={brands.isLoading}
              emptyText={search ? t('repair.devicesPage.noFilteredBrands', { ns: 'app' }) : t('repair.devicesPage.noBrands', { ns: 'app' })}
              getRowKey={(brand) => brand.id}
              columns={[
                { key: 'name', header: t('repair.devicesPage.brandName', { ns: 'app' }), render: (brand) => brand.name },
              ]}
            />
            <form
              className="entity-form"
              onSubmit={brandForm.handleSubmit(async (values) => {
                if (!values.name.trim()) {
                  return;
                }

                await createBrand.mutateAsync({ name: values.name.trim() });
              })}
            >
              <Input label={t('repair.devicesPage.brandName', { ns: 'app' })} {...brandForm.register('name')} />
              <Button type="submit" icon={<Plus size={18} />} isLoading={createBrand.isPending}>
                {t('repair.devicesPage.createBrand', { ns: 'app' })}
              </Button>
            </form>
          </article>

          <article className="ops-directory-card">
            <div className="detail-stack">
              <h2>{t('repair.devicesPage.modelsTitle', { ns: 'app' })}</h2>
              <p className="muted">{t('repair.devicesPage.modelHelp', { ns: 'app' })}</p>
            </div>
            <DataTable
              rows={filteredModels}
              isLoading={models.isLoading}
              emptyText={search ? t('repair.devicesPage.noFilteredModels', { ns: 'app' }) : t('repair.devicesPage.noModels', { ns: 'app' })}
              getRowKey={(model) => model.id}
              columns={[
                {
                  key: 'name',
                  header: t('repair.devicesPage.modelName', { ns: 'app' }),
                  render: (model) => (
                    <div className="detail-stack">
                      <strong>{model.name}</strong>
                      <span className="muted">{model.brand_name ?? '-'}</span>
                    </div>
                  ),
                },
                { key: 'category', header: t('repair.devicesPage.categoryName', { ns: 'app' }), render: (model) => model.category_name_ru ?? '-' },
              ]}
            />
            <form
              className="entity-form"
              onSubmit={modelForm.handleSubmit(async (values) => {
                if (!values.categoryId || !values.brandId || !values.name.trim()) {
                  return;
                }

                await createModel.mutateAsync({ categoryId: Number(values.categoryId), brandId: Number(values.brandId), name: values.name.trim() });
              })}
            >
              <div className="ops-form-grid">
                <Select
                  label={t('repair.devicesPage.categoryName', { ns: 'app' })}
                  value={selectedCategoryIdForModel}
                  onChange={(event) => modelForm.setValue('categoryId', event.target.value)}
                >
                  <option value="">{t('repair.devicesPage.selectCategory', { ns: 'app' })}</option>
                  {itemsCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name_ru}
                    </option>
                  ))}
                </Select>
                <Select
                  label={t('repair.devicesPage.brandName', { ns: 'app' })}
                  value={selectedBrandIdForModel}
                  onChange={(event) => modelForm.setValue('brandId', event.target.value)}
                >
                  <option value="">{t('repair.devicesPage.selectBrand', { ns: 'app' })}</option>
                  {itemsBrands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </Select>
                <Input label={t('repair.devicesPage.modelName', { ns: 'app' })} {...modelForm.register('name')} />
              </div>
              <Button type="submit" icon={<Plus size={18} />} isLoading={createModel.isPending}>
                {t('repair.devicesPage.createModel', { ns: 'app' })}
              </Button>
            </form>
          </article>
        </div>
      </section>

      <section className="panel ops-panel">
        <div className="ops-panel-header">
          <div className="entity-toolbar-copy">
            <h2>{t('repair.devicesPage.createDeviceTitle', { ns: 'app' })}</h2>
            <p className="muted">{t('repair.devicesPage.deviceCreationDescription', { ns: 'app' })}</p>
          </div>
        </div>

        <div className="ops-split-panel">
          <form
            className="entity-form"
            onSubmit={deviceForm.handleSubmit(async (values) => {
              if (!values.customerId || !values.categoryId || !values.deviceName.trim()) {
                return;
              }

              await createDevice.mutateAsync({
                customerId: Number(values.customerId),
                categoryId: Number(values.categoryId),
                brandId: values.brandId ? Number(values.brandId) : null,
                modelId: values.modelId ? Number(values.modelId) : null,
                deviceName: values.deviceName.trim(),
              });
            })}
          >
            <div className="ops-form-grid">
              <Input
                label={t('repair.searchCustomers', { ns: 'app' })}
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
              />
              <Select
                label={t('repair.customerField', { ns: 'app' })}
                value={selectedCustomerId}
                onChange={(event) => deviceForm.setValue('customerId', event.target.value)}
              >
                <option value="">{t('repair.devicesPage.selectCustomer', { ns: 'app' })}</option>
                {(customersQuery.data?.items ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_code} - {customer.name}
                  </option>
                ))}
              </Select>
              <Select
                label={t('repair.devicesPage.categoryName', { ns: 'app' })}
                value={selectedCategoryIdForDevice}
                onChange={(event) => {
                  deviceForm.setValue('categoryId', event.target.value);
                  deviceForm.setValue('modelId', '');
                }}
              >
                <option value="">{t('repair.devicesPage.selectCategory', { ns: 'app' })}</option>
                {itemsCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name_ru}
                  </option>
                ))}
              </Select>
              <Select
                label={t('repair.devicesPage.brandName', { ns: 'app' })}
                value={selectedBrandIdForDevice}
                onChange={(event) => {
                  deviceForm.setValue('brandId', event.target.value);
                  deviceForm.setValue('modelId', '');
                }}
              >
                <option value="">{t('repair.devicesPage.selectBrandOptional', { ns: 'app' })}</option>
                {itemsBrands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
              <Select
                label={t('repair.devicesPage.modelName', { ns: 'app' })}
                value={deviceForm.watch('modelId')}
                onChange={(event) => deviceForm.setValue('modelId', event.target.value)}
              >
                <option value="">{t('repair.devicesPage.selectModelOptional', { ns: 'app' })}</option>
                {modelsForDevice.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.brand_name ? `${model.brand_name} - ${model.name}` : model.name}
                  </option>
                ))}
              </Select>
              <Input label={t('repair.devicesPage.deviceName', { ns: 'app' })} {...deviceForm.register('deviceName')} />
            </div>
            <Button type="submit" icon={<Plus size={18} />} isLoading={createDevice.isPending}>
              {t('repair.devicesPage.createDevice', { ns: 'app' })}
            </Button>
          </form>

          <div className="ops-side-stack">
            <article className="ops-directory-card">
              <div className="detail-stack">
                <h2>{t('repair.devicesPage.customerDevicesTitle', { ns: 'app' })}</h2>
                <p className="muted">{t('repair.devicesPage.customerDevicesDescription', { ns: 'app' })}</p>
              </div>
              {Number(selectedCustomerId) > 0 ? (
                <DataTable
                  rows={customerDevicesQuery.data?.items ?? []}
                  isLoading={customerDevicesQuery.isLoading}
                  emptyText={t('repair.devicesPage.noCustomerDevices', { ns: 'app' })}
                  getRowKey={(device) => device.id}
                  columns={[
                    {
                      key: 'device',
                      header: t('repair.device', { ns: 'app' }),
                      render: (device) => (
                        <div className="detail-stack">
                          <strong>{device.device_name}</strong>
                          <span className="muted">
                            {[device.category_name_ru, device.brand_name, device.model_name].filter(Boolean).join(' / ') || '-'}
                          </span>
                        </div>
                      ),
                    },
                    { key: 'created', header: t('repair.createdAt', { ns: 'app' }), render: (device) => formatDate(device.created_at, locale) },
                  ]}
                />
              ) : (
                <p className="muted">{t('repair.devicesPage.selectCustomerHint', { ns: 'app' })}</p>
              )}
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
