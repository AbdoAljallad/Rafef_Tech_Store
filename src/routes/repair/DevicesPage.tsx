import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { repairApi } from '../../modules/repair/api/repair.api';
import { Button } from '../../shared/ui/Button';

export function DevicesPage() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['repairCategories'], queryFn: repairApi.listCategories });
  const brands = useQuery({ queryKey: ['repairBrands'], queryFn: repairApi.listBrands });
  const models = useQuery({ queryKey: ['repairModels'], queryFn: repairApi.listModels });

  const createCategory = useMutation({ mutationFn: repairApi.createCategory, onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['repairCategories'] }) });
  const createBrand = useMutation({ mutationFn: repairApi.createBrand, onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['repairBrands'] }) });
  const createModel = useMutation({ mutationFn: repairApi.createModel, onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['repairModels'] }) });
  const createDevice = useMutation({ mutationFn: repairApi.createDevice });

  const catForm = useForm({ defaultValues: { code: '', nameRu: '' } });
  const brandForm = useForm({ defaultValues: { name: '' } });
  const modelForm = useForm({ defaultValues: { categoryId: '', brandId: '', name: '' } });
  const deviceForm = useForm({ defaultValues: { customerId: '', categoryId: '', brandId: '', modelId: '', deviceName: '' } });

  return (
    <>
      <header className="page-header"><div><p className="eyebrow">Ремонт</p><h1>Устройства и справочники</h1></div></header>
      <section className="grid">
        <div>
          <h3>Категории</h3>
          <ul>{(categories.data?.items ?? []).map((category: any) => <li key={category.id}>{category.name_ru}</li>)}</ul>
          <form onSubmit={catForm.handleSubmit((values) => createCategory.mutate(values))}>
            <input placeholder="код" {...catForm.register('code')} />
            <input placeholder="название" {...catForm.register('nameRu')} />
            <Button type="submit">Создать категорию</Button>
          </form>
        </div>

        <div>
          <h3>Бренды</h3>
          <ul>{(brands.data?.items ?? []).map((brand: any) => <li key={brand.id}>{brand.name}</li>)}</ul>
          <form onSubmit={brandForm.handleSubmit((values) => createBrand.mutate(values))}>
            <input placeholder="название" {...brandForm.register('name')} />
            <Button type="submit">Создать бренд</Button>
          </form>
        </div>

        <div>
          <h3>Модели</h3>
          <ul>{(models.data?.items ?? []).map((model: any) => <li key={model.id}>{model.name}</li>)}</ul>
          <form onSubmit={modelForm.handleSubmit((values) => createModel.mutate({ categoryId: Number(values.categoryId), brandId: Number(values.brandId), name: values.name }))}>
            <input placeholder="id категории" {...modelForm.register('categoryId')} />
            <input placeholder="id бренда" {...modelForm.register('brandId')} />
            <input placeholder="название" {...modelForm.register('name')} />
            <Button type="submit">Создать модель</Button>
          </form>
        </div>

        <div>
          <h3>Создание устройства</h3>
          <form onSubmit={deviceForm.handleSubmit((values) => createDevice.mutate({ customerId: Number(values.customerId), categoryId: Number(values.categoryId), brandId: values.brandId ? Number(values.brandId) : null, modelId: values.modelId ? Number(values.modelId) : null, deviceName: values.deviceName }))}>
            <input placeholder="id клиента" {...deviceForm.register('customerId')} />
            <input placeholder="id категории" {...deviceForm.register('categoryId')} />
            <input placeholder="id бренда" {...deviceForm.register('brandId')} />
            <input placeholder="id модели" {...deviceForm.register('modelId')} />
            <input placeholder="название устройства" {...deviceForm.register('deviceName')} />
            <Button type="submit">Создать устройство</Button>
          </form>
        </div>
      </section>
    </>
  );
}
