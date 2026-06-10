import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { repairApi } from '../../modules/repair/api/repair.api';
import { Button } from '../../shared/ui/Button';

export function DevicesPage() {
  const { t } = useTranslation('app');
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['repairCategories'], queryFn: repairApi.listCategories });
  const brands = useQuery({ queryKey: ['repairBrands'], queryFn: repairApi.listBrands });
  const models = useQuery({ queryKey: ['repairModels'], queryFn: repairApi.listModels });

  const createCategory = useMutation({
    mutationFn: repairApi.createCategory,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['repairCategories'] }),
  });
  const createBrand = useMutation({
    mutationFn: repairApi.createBrand,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['repairBrands'] }),
  });
  const createModel = useMutation({
    mutationFn: repairApi.createModel,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['repairModels'] }),
  });
  const createDevice = useMutation({ mutationFn: repairApi.createDevice });

  const catForm = useForm({ defaultValues: { code: '', nameRu: '' } });
  const brandForm = useForm({ defaultValues: { name: '' } });
  const modelForm = useForm({ defaultValues: { categoryId: '', brandId: '', name: '' } });
  const deviceForm = useForm({ defaultValues: { customerId: '', categoryId: '', brandId: '', modelId: '', deviceName: '' } });

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('repair.module')}</p>
          <h1>{t('repair.devicesTitle')}</h1>
        </div>
      </header>

      <section className="detail-grid">
        <article className="panel">
          <h2>{t('repair.devicesPage.categoriesTitle')}</h2>
          {(categories.data?.items ?? []).length > 0 ? (
            <ul>{(categories.data?.items ?? []).map((category: any) => <li key={category.id}>{category.name_ru}</li>)}</ul>
          ) : (
            <p className="muted">{t('repair.devicesPage.noCategories')}</p>
          )}
          <form className="form-stack" onSubmit={catForm.handleSubmit((values) => createCategory.mutate(values))}>
            <input placeholder={t('repair.devicesPage.categoryCode')} {...catForm.register('code')} />
            <input placeholder={t('repair.devicesPage.categoryName')} {...catForm.register('nameRu')} />
            <Button type="submit">{t('repair.devicesPage.createCategory')}</Button>
          </form>
        </article>

        <article className="panel">
          <h2>{t('repair.devicesPage.brandsTitle')}</h2>
          {(brands.data?.items ?? []).length > 0 ? (
            <ul>{(brands.data?.items ?? []).map((brand: any) => <li key={brand.id}>{brand.name}</li>)}</ul>
          ) : (
            <p className="muted">{t('repair.devicesPage.noBrands')}</p>
          )}
          <form className="form-stack" onSubmit={brandForm.handleSubmit((values) => createBrand.mutate(values))}>
            <input placeholder={t('repair.devicesPage.brandName')} {...brandForm.register('name')} />
            <Button type="submit">{t('repair.devicesPage.createBrand')}</Button>
          </form>
        </article>

        <article className="panel">
          <h2>{t('repair.devicesPage.modelsTitle')}</h2>
          {(models.data?.items ?? []).length > 0 ? (
            <ul>{(models.data?.items ?? []).map((model: any) => <li key={model.id}>{model.name}</li>)}</ul>
          ) : (
            <p className="muted">{t('repair.devicesPage.noModels')}</p>
          )}
          <form
            className="form-stack"
            onSubmit={modelForm.handleSubmit((values) =>
              createModel.mutate({ categoryId: Number(values.categoryId), brandId: Number(values.brandId), name: values.name }),
            )}
          >
            <input placeholder={t('repair.devicesPage.categoryId')} {...modelForm.register('categoryId')} />
            <input placeholder={t('repair.devicesPage.brandId')} {...modelForm.register('brandId')} />
            <input placeholder={t('repair.devicesPage.modelName')} {...modelForm.register('name')} />
            <Button type="submit">{t('repair.devicesPage.createModel')}</Button>
          </form>
        </article>

        <article className="panel">
          <h2>{t('repair.devicesPage.createDeviceTitle')}</h2>
          <form
            className="form-stack"
            onSubmit={deviceForm.handleSubmit((values) =>
              createDevice.mutate({
                customerId: Number(values.customerId),
                categoryId: Number(values.categoryId),
                brandId: values.brandId ? Number(values.brandId) : null,
                modelId: values.modelId ? Number(values.modelId) : null,
                deviceName: values.deviceName,
              }),
            )}
          >
            <input placeholder={t('repair.devicesPage.customerId')} {...deviceForm.register('customerId')} />
            <input placeholder={t('repair.devicesPage.categoryId')} {...deviceForm.register('categoryId')} />
            <input placeholder={t('repair.devicesPage.brandId')} {...deviceForm.register('brandId')} />
            <input placeholder={t('repair.devicesPage.modelId')} {...deviceForm.register('modelId')} />
            <input placeholder={t('repair.devicesPage.deviceName')} {...deviceForm.register('deviceName')} />
            <Button type="submit">{t('repair.devicesPage.createDevice')}</Button>
          </form>
        </article>
      </section>
    </>
  );
}
