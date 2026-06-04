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
      <header className="page-header"><div><p className="eyebrow">Repair</p><h1>Devices & Dictionaries</h1></div></header>
      <section className="grid">
        <div>
          <h3>Categories</h3>
          <ul>{(categories.data?.items ?? []).map((c: any) => <li key={c.id}>{c.name_ru}</li>)}</ul>
          <form onSubmit={catForm.handleSubmit((v) => createCategory.mutate(v))}>
            <input placeholder="code" {...catForm.register('code')} />
            <input placeholder="nameRu" {...catForm.register('nameRu')} />
            <Button type="submit">Create Category</Button>
          </form>
        </div>

        <div>
          <h3>Brands</h3>
          <ul>{(brands.data?.items ?? []).map((b: any) => <li key={b.id}>{b.name}</li>)}</ul>
          <form onSubmit={brandForm.handleSubmit((v) => createBrand.mutate(v))}>
            <input placeholder="name" {...brandForm.register('name')} />
            <Button type="submit">Create Brand</Button>
          </form>
        </div>

        <div>
          <h3>Models</h3>
          <ul>{(models.data?.items ?? []).map((m: any) => <li key={m.id}>{m.name}</li>)}</ul>
          <form onSubmit={modelForm.handleSubmit((v) => createModel.mutate({ categoryId: Number(v.categoryId), brandId: Number(v.brandId), name: v.name }))}>
            <input placeholder="categoryId" {...modelForm.register('categoryId')} />
            <input placeholder="brandId" {...modelForm.register('brandId')} />
            <input placeholder="name" {...modelForm.register('name')} />
            <Button type="submit">Create Model</Button>
          </form>
        </div>

        <div>
          <h3>Create Device</h3>
          <form onSubmit={deviceForm.handleSubmit((v) => createDevice.mutate({ customerId: Number(v.customerId), categoryId: Number(v.categoryId), brandId: v.brandId ? Number(v.brandId) : null, modelId: v.modelId ? Number(v.modelId) : null, deviceName: v.deviceName }))}>
            <input placeholder="customerId" {...deviceForm.register('customerId')} />
            <input placeholder="categoryId" {...deviceForm.register('categoryId')} />
            <input placeholder="brandId" {...deviceForm.register('brandId')} />
            <input placeholder="modelId" {...deviceForm.register('modelId')} />
            <input placeholder="deviceName" {...deviceForm.register('deviceName')} />
            <Button type="submit">Create Device</Button>
          </form>
        </div>
      </section>
    </>
  );
}
