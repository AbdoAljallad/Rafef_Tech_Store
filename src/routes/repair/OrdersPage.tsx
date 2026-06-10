import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { repairApi } from '../../modules/repair/api/repair.api';
import { crmApi } from '../../modules/crm/api/crm.api';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { FormDrawer } from '../../shared/components/FormDrawer/FormDrawer';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

type DeviceMode = 'existing' | 'new';

type RepairOrderFormValues = {
  customerId: string;
  deviceId: string;
  categoryId: string;
  brandId: string;
  modelId: string;
  deviceName: string;
  serialNo: string;
  imei: string;
  deviceNotes: string;
  problemDescription: string;
  intakeNotes: string;
};

const defaultValues: RepairOrderFormValues = {
  customerId: '',
  deviceId: '',
  categoryId: '',
  brandId: '',
  modelId: '',
  deviceName: '',
  serialNo: '',
  imei: '',
  deviceNotes: '',
  problemDescription: '',
  intakeNotes: '',
};

export function OrdersPage() {
  const { t } = useTranslation(['app', 'statuses']);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('existing');
  const [customerSearch, setCustomerSearch] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const form = useForm<RepairOrderFormValues>({ defaultValues });

  const selectedCustomerId = form.watch('customerId');
  const selectedCategoryId = form.watch('categoryId');
  const selectedBrandId = form.watch('brandId');
  const customerIdNumber = Number(selectedCustomerId || 0);

  const ordersQuery = useQuery({
    queryKey: ['repairOrders'],
    queryFn: () => repairApi.listOrders({ offset: 0, limit: 50 }),
  });
  const customersQuery = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => crmApi.listCustomers(customerSearch),
  });
  const devicesQuery = useQuery({
    queryKey: ['repairDevices', customerIdNumber],
    queryFn: () => repairApi.listCustomerDevices(customerIdNumber),
    enabled: customerIdNumber > 0,
  });
  const categoriesQuery = useQuery({
    queryKey: ['repairDeviceCategories'],
    queryFn: () => repairApi.listCategories(),
    enabled: isCreateOpen,
  });
  const brandsQuery = useQuery({
    queryKey: ['repairDeviceBrands'],
    queryFn: () => repairApi.listBrands(),
    enabled: isCreateOpen,
  });
  const modelsQuery = useQuery({
    queryKey: ['repairDeviceModels'],
    queryFn: () => repairApi.listModels(),
    enabled: isCreateOpen,
  });

  const createMutation = useMutation({
    mutationFn: repairApi.createOrder,
    onSuccess: async () => {
      handleDrawerClose();
      await queryClient.invalidateQueries({ queryKey: ['repairOrders'] });
    },
  });

  useEffect(() => {
    form.setValue('deviceId', '');
    if (deviceMode === 'existing' && customerIdNumber > 0 && devicesQuery.data?.items?.length === 0) {
      setDeviceMode('new');
    }
  }, [customerIdNumber, deviceMode, devicesQuery.data?.items?.length, form]);

  const filteredModels = useMemo(() => {
    const items = modelsQuery.data?.items ?? [];
    return items.filter((model) => {
      if (selectedCategoryId && Number(model.category_id ?? model.categoryId) !== Number(selectedCategoryId)) {
        return false;
      }
      if (selectedBrandId && Number(model.brand_id ?? model.brandId) !== Number(selectedBrandId)) {
        return false;
      }
      return true;
    });
  }, [modelsQuery.data?.items, selectedBrandId, selectedCategoryId]);

  function handleDrawerClose() {
    setIsCreateOpen(false);
    setDeviceMode('existing');
    setCustomerSearch('');
    setSubmitError(null);
    form.reset(defaultValues);
  }

  async function handleCreate(values: RepairOrderFormValues) {
    setSubmitError(null);

    if (!values.customerId) {
      setSubmitError(t('repair.customerRequired'));
      return;
    }

    if (deviceMode === 'existing' && !values.deviceId) {
      setSubmitError(t('repair.deviceRequired'));
      return;
    }

    if (deviceMode === 'new' && (!values.categoryId || !values.deviceName.trim())) {
      setSubmitError(t('repair.deviceRequired'));
      return;
    }

    const payload =
      deviceMode === 'existing'
        ? {
            customerId: Number(values.customerId),
            deviceId: Number(values.deviceId),
            problemDescription: values.problemDescription,
            intakeNotes: values.intakeNotes || null,
          }
        : {
            customerId: Number(values.customerId),
            problemDescription: values.problemDescription,
            intakeNotes: values.intakeNotes || null,
            newDevice: {
              categoryId: Number(values.categoryId),
              brandId: values.brandId ? Number(values.brandId) : null,
              modelId: values.modelId ? Number(values.modelId) : null,
              deviceName: values.deviceName.trim(),
              serialNo: values.serialNo.trim() || null,
              imei: values.imei.trim() || null,
              notes: values.deviceNotes.trim() || null,
            },
          };

    try {
      await createMutation.mutateAsync(payload);
    } catch {
      setSubmitError(t('sales.errors.generic'));
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('repair.module')}</p>
          <h1>{t('repair.ordersTitle')}</h1>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
          {t('repair.newRepair')}
        </Button>
      </header>

      <DataTable
        rows={ordersQuery.data?.items ?? []}
        isLoading={ordersQuery.isLoading}
        emptyText={ordersQuery.isError ? t('repair.loadFailed') : t('repair.noOrders')}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/repair/orders/${row.id}`)}
        columns={[
          { key: 'code', header: t('repair.code'), render: (row) => row.order_code },
          { key: 'customer', header: t('repair.customer'), render: (row) => row.customer_name ?? row.customer_id },
          { key: 'device', header: t('repair.device'), render: (row) => row.device_name ?? row.device_id },
          { key: 'status', header: t('repair.status'), render: (row) => String(t(`statuses:repair.${row.status}`)) },
        ]}
      />

      <FormDrawer title={t('repair.createRepair')} isOpen={isCreateOpen} onClose={handleDrawerClose}>
        <form onSubmit={form.handleSubmit(handleCreate)} className="stack">
          {submitError ? <div className="notice error">{submitError}</div> : null}

          <SearchInput
            placeholder={t('repair.searchCustomers')}
            value={customerSearch}
            onChange={(event) => setCustomerSearch((event.target as HTMLInputElement).value)}
          />

          <Select
            label={t('repair.selectCustomer')}
            value={selectedCustomerId}
            onChange={(event) => form.setValue('customerId', event.target.value)}
          >
            <option value="">{t('repair.selectCustomerPlaceholder')}</option>
            {(customersQuery.data?.items ?? []).map((customer: any) => (
              <option key={customer.id} value={customer.id}>
                {customer.customer_code} - {customer.name}
              </option>
            ))}
          </Select>

          <div className="actions">
            <Button
              type="button"
              variant={deviceMode === 'existing' ? 'primary' : 'secondary'}
              onClick={() => setDeviceMode('existing')}
            >
              {t('repair.useExistingDevice')}
            </Button>
            <Button
              type="button"
              variant={deviceMode === 'new' ? 'primary' : 'secondary'}
              onClick={() => setDeviceMode('new')}
            >
              {t('repair.createNewDevice')}
            </Button>
          </div>

          {deviceMode === 'existing' ? (
            <>
              <Select
                label={t('repair.selectDevice')}
                value={form.watch('deviceId')}
                onChange={(event) => form.setValue('deviceId', event.target.value)}
                disabled={!selectedCustomerId}
              >
                <option value="">{t('repair.selectDevice')}</option>
                {(devicesQuery.data?.items ?? []).map((device: any) => (
                  <option key={device.id} value={device.id}>
                    {device.device_name}
                  </option>
                ))}
              </Select>
              {selectedCustomerId && !devicesQuery.isLoading && (devicesQuery.data?.items?.length ?? 0) === 0 ? (
                <div className="notice">{t('repair.noDevicesForCustomer')}</div>
              ) : null}
            </>
          ) : (
            <>
              <Select
                label={t('repair.devicesPage.categoryName')}
                value={form.watch('categoryId')}
                onChange={(event) => form.setValue('categoryId', event.target.value)}
              >
                <option value="">{t('repair.devicesPage.categoryName')}</option>
                {(categoriesQuery.data?.items ?? []).map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name_ru ?? category.nameRu ?? category.default_name}
                  </option>
                ))}
              </Select>

              <Select
                label={t('repair.devicesPage.brandName')}
                value={form.watch('brandId')}
                onChange={(event) => form.setValue('brandId', event.target.value)}
              >
                <option value="">{t('repair.devicesPage.brandName')}</option>
                {(brandsQuery.data?.items ?? []).map((brand: any) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>

              <Select
                label={t('repair.devicesPage.modelName')}
                value={form.watch('modelId')}
                onChange={(event) => form.setValue('modelId', event.target.value)}
                disabled={filteredModels.length === 0}
              >
                <option value="">{t('repair.devicesPage.modelName')}</option>
                {filteredModels.map((model: any) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </Select>

              <Input
                label={t('repair.devicesPage.deviceName')}
                value={form.watch('deviceName')}
                onChange={(event) => form.setValue('deviceName', event.target.value)}
              />
              <Input
                label={t('repair.serialNo')}
                value={form.watch('serialNo')}
                onChange={(event) => form.setValue('serialNo', event.target.value)}
              />
              <Input
                label="IMEI"
                value={form.watch('imei')}
                onChange={(event) => form.setValue('imei', event.target.value)}
              />
              <Textarea
                label={t('repair.notes')}
                rows={3}
                value={form.watch('deviceNotes')}
                onChange={(event) => form.setValue('deviceNotes', event.target.value)}
              />
            </>
          )}

          <Textarea
            label={t('repair.problemDescription')}
            rows={4}
            value={form.watch('problemDescription')}
            onChange={(event) => form.setValue('problemDescription', event.target.value)}
          />
          <Textarea
            label={t('repair.intakeNotes')}
            rows={3}
            value={form.watch('intakeNotes')}
            onChange={(event) => form.setValue('intakeNotes', event.target.value)}
          />

          <div className="actions">
            <Button type="submit" disabled={createMutation.isPending}>
              {t('repair.create')}
            </Button>
          </div>
        </form>
      </FormDrawer>
    </>
  );
}
