import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  History,
  NotebookPen,
  Package,
  Printer,
  ShoppingCart,
  Trash2,
  Truck,
  Wrench,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { getAvailableQuantity, hasAvailableStock } from '../../modules/catalog/utils/stockAvailability';
import { repairApi } from '../../modules/repair/api/repair.api';
import { isApiError } from '../../shared/api/apiErrors';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Textarea } from '../../shared/ui/Textarea';

const statusOptions = [
  'new',
  'inspection',
  'waiting_customer_approval',
  'waiting_part',
  'in_repair',
  'ready_for_delivery',
  'delivered',
  'cancelled',
] as const;

type FeedbackState = {
  tone: 'success' | 'error';
  message: string;
};

type ServiceDraft = {
  serviceName: string;
  quantity: string;
  unitPrice: string;
};

function getRepairErrorMessage(error: unknown, t: TFunction<'app' | 'statuses'>) {
  if (!isApiError(error)) {
    return t('repair.errors.generic');
  }

  if (error.code === 'NETWORK_ERROR') {
    return t('repair.errors.network');
  }

  if (error.code === 'NOT_FOUND') {
    return t('repair.errors.notFound');
  }

  if (error.code === 'STATE_CONFLICT') {
    return t('repair.errors.stateConflict');
  }

  if (error.code === 'INSUFFICIENT_STOCK') {
    return t('repair.errors.insufficientStock');
  }

  if (error.code === 'VALIDATION_ERROR') {
    return t('repair.errors.validation');
  }

  if (error.code === 'PERMISSION_DENIED' || error.status === 403) {
    return t('repair.errors.permissionDenied');
  }

  if (error.code === 'AUTH_REQUIRED' || error.status === 401) {
    return t('repair.errors.authRequired');
  }

  return error.message || t('repair.errors.generic');
}

function getStatusTone(status: string | null | undefined): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'ready_for_delivery':
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'inspection':
    case 'waiting_customer_approval':
    case 'waiting_part':
      return 'warning';
    case 'new':
    case 'in_repair':
      return 'info';
    default:
      return 'neutral';
  }
}

export function OrderDetailPage() {
  const { t, i18n } = useTranslation(['app', 'statuses']);
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({ defaultValues: { noteText: '' } });
  const [serviceName, setServiceName] = useState('');
  const [serviceQty, setServiceQty] = useState('1');
  const [serviceUnitPrice, setServiceUnitPrice] = useState('0');
  const [productSearch, setProductSearch] = useState('');
  const [partProductId, setPartProductId] = useState<number | ''>('');
  const [partQty, setPartQty] = useState(1);
  const [partError, setPartError] = useState('');
  const [reservationResult, setReservationResult] = useState<any>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft | null>(null);
  const [editingPartId, setEditingPartId] = useState<number | null>(null);
  const [partDraftQty, setPartDraftQty] = useState('');

  const orderId = Number(id);
  const orderQuery = useQuery({
    queryKey: ['repairOrder', id],
    queryFn: () => repairApi.getOrder(orderId),
    enabled: Boolean(id) && Number.isFinite(orderId),
  });
  const billingQuery = useQuery({
    queryKey: ['repairOrderBilling', id],
    queryFn: () => repairApi.getOrderBilling(orderId),
    enabled: Boolean(id) && Number.isFinite(orderId),
  });
  const productsQuery = useQuery({
    queryKey: ['repair-products', productSearch],
    queryFn: () => catalogApi.listProducts(productSearch, { pageSize: 300 }),
  });

  const refreshRepairData = async () => {
    await Promise.all([
      orderQuery.refetch(),
      billingQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ['repairOrders'] }),
      queryClient.invalidateQueries({ queryKey: ['repair-products'] }),
    ]);
  };

  const addServiceMutation = useMutation({
    mutationFn: (payload: any) => repairApi.addService(orderId, payload),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await refreshRepairData();
      setServiceName('');
      setServiceQty('1');
      setServiceUnitPrice('0');
      setFeedback({ tone: 'success', message: t('repair.messages.serviceAdded') });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getRepairErrorMessage(error, t) });
    },
  });
  const addPartMutation = useMutation({
    mutationFn: (payload: any) => repairApi.addPart(orderId, payload),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async (result: any) => {
      await refreshRepairData();
      setReservationResult(result);
      setPartError('');
      setPartProductId('');
      setPartQty(1);
      setFeedback({ tone: 'success', message: t('repair.messages.partAdded') });
    },
    onError: (error) => {
      const message = getRepairErrorMessage(error, t);
      setPartError(message);
      setFeedback({ tone: 'error', message });
    },
  });
  const updateServiceMutation = useMutation({
    mutationFn: ({ serviceId, payload }: { serviceId: number; payload: ServiceDraft }) =>
      repairApi.updateService(orderId, serviceId, {
        serviceName: payload.serviceName.trim(),
        quantity: Number(payload.quantity),
        unitPrice: Number(payload.unitPrice),
      }),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await refreshRepairData();
      setEditingServiceId(null);
      setServiceDraft(null);
      setFeedback({ tone: 'success', message: t('repair.messages.serviceUpdated') });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getRepairErrorMessage(error, t) });
    },
  });
  const updatePartMutation = useMutation({
    mutationFn: ({ partId, quantity }: { partId: number; quantity: number }) =>
      repairApi.updatePart(orderId, partId, { quantity }),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await refreshRepairData();
      setEditingPartId(null);
      setPartDraftQty('');
      setFeedback({ tone: 'success', message: t('repair.messages.partUpdated') });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getRepairErrorMessage(error, t) });
    },
  });
  const removeServiceMutation = useMutation({
    mutationFn: (serviceId: number) => repairApi.removeService(orderId, serviceId),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await refreshRepairData();
      setEditingServiceId(null);
      setServiceDraft(null);
      setFeedback({ tone: 'success', message: t('repair.messages.serviceRemoved') });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getRepairErrorMessage(error, t) });
    },
  });
  const removePartMutation = useMutation({
    mutationFn: (partId: number) => repairApi.removePart(orderId, partId),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await refreshRepairData();
      setEditingPartId(null);
      setPartDraftQty('');
      setFeedback({ tone: 'success', message: t('repair.messages.partRemoved') });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getRepairErrorMessage(error, t) });
    },
  });
  const changeStatusMutation = useMutation({
    mutationFn: (payload: any) => repairApi.changeStatus(orderId, payload),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await refreshRepairData();
      setReservationResult(null);
      setFeedback({ tone: 'success', message: t('repair.messages.statusUpdated') });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getRepairErrorMessage(error, t) });
    },
  });
  const deleteOrderMutation = useMutation({
    mutationFn: () => repairApi.deleteOrder(orderId),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['repairOrders'] });
      navigate('/repair/orders', { replace: true });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getRepairErrorMessage(error, t) });
    },
  });
  const addNoteMutation = useMutation({
    mutationFn: (payload: any) => repairApi.addNote(orderId, payload),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await orderQuery.refetch();
      form.reset();
      setFeedback({ tone: 'success', message: t('repair.messages.noteAdded') });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: getRepairErrorMessage(error, t) });
    },
  });

  const repairProducts = useMemo(
    () => (productsQuery.data?.items ?? []).filter((product: any) => Number(product.show_in_repair ?? 0) === 1),
    [productsQuery.data?.items],
  );
  const selectedProduct = repairProducts.find((product: any) => product.id === partProductId) ?? null;
  const order = orderQuery.data?.order;
  const billing = billingQuery.data?.billing;
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';
  const isOrderLocked = order?.status === 'cancelled' || order?.status === 'delivered';
  const services = order?.services ?? [];
  const parts = order?.parts ?? [];
  const notes = [...(order?.notes ?? [])].reverse();
  const history = [...(order?.history ?? [])].reverse();
  const pendingLineCount = (billing?.services ?? []).length + (billing?.parts ?? []).length;
  const billedLineCount = services.filter((service: any) => Boolean(service.sales_invoice_id)).length
    + parts.filter((part: any) => Boolean(part.sales_invoice_id)).length;
  const pendingTotal = [...(billing?.services ?? []), ...(billing?.parts ?? [])].reduce(
    (sum: number, line: any) => sum + Number(line.line_total ?? 0),
    0,
  );
  const deviceMeta = [order?.device_category_name, order?.device_brand_name, order?.device_model_name]
    .filter(Boolean)
    .join(' - ');

  if (!id || !Number.isFinite(orderId)) {
    return null;
  }

  function formatMoney(value: string | number | null | undefined) {
    return Number(value ?? 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatQuantity(value: string | number | null | undefined) {
    return Number(value ?? 0).toLocaleString(locale, { maximumFractionDigits: 4 });
  }

  function formatDateTime(value: string | null | undefined) {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  function formatStatusLabel(status: string | null | undefined) {
    if (!status) {
      return '-';
    }

    return String(t(`statuses:repair.${status}`, { defaultValue: status }));
  }

  function getReservationStatusLabel(status: string | null | undefined) {
    if (!status) {
      return null;
    }
    const key = `repair.reservationStatuses.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  }

  function validatePartSelection() {
    if (!partProductId) {
      return t('repair.productRequired');
    }
    if (partQty < 0.0001) {
      return t('repair.quantityMin');
    }
    if (!selectedProduct || !hasAvailableStock(selectedProduct)) {
      return t('sales.errors.outOfStock');
    }
    const available = getAvailableQuantity(selectedProduct);
    if (partQty > available) {
      return t('sales.errors.quantityExceedsAvailable', { count: available });
    }
    return null;
  }

  function validateNewService() {
    if (!serviceName.trim()) {
      return t('repair.serviceNameRequired');
    }
    if (Number(serviceQty) < 0.0001) {
      return t('repair.quantityMin');
    }
    if (Number(serviceUnitPrice) < 0) {
      return t('repair.errors.validation');
    }
    return null;
  }

  function validateServiceDraft() {
    if (!serviceDraft || !serviceDraft.serviceName.trim()) {
      return t('repair.serviceNameRequired');
    }
    if (Number(serviceDraft.quantity) < 0.0001) {
      return t('repair.quantityMin');
    }
    if (Number(serviceDraft.unitPrice) < 0) {
      return t('repair.errors.validation');
    }
    return null;
  }

  function validatePartDraft(part: any) {
    const draftQty = Number(partDraftQty);
    if (draftQty < 0.0001) {
      return t('repair.quantityMin');
    }

    const product = repairProducts.find((candidate: any) => Number(candidate.id) === Number(part.product_id));
    if (product) {
      const maxAllowed = getAvailableQuantity(product) + Number(part.quantity ?? 0);
      if (draftQty > maxAllowed) {
        return t('sales.errors.quantityExceedsAvailable', { count: maxAllowed });
      }
    }

    return null;
  }

  function canManageService(service: any) {
    return !isOrderLocked && !service.sales_invoice_id;
  }

  function canManagePart(part: any) {
    return !isOrderLocked && !part.sales_invoice_id && part.reservation_status === 'active';
  }

  function beginEditService(service: any) {
    setEditingPartId(null);
    setPartDraftQty('');
    setEditingServiceId(Number(service.id));
    setServiceDraft({
      serviceName: service.service_name_snapshot ?? '',
      quantity: String(service.quantity ?? 1),
      unitPrice: String(service.unit_price_snapshot ?? 0),
    });
  }

  function beginEditPart(part: any) {
    setEditingServiceId(null);
    setServiceDraft(null);
    setEditingPartId(Number(part.id));
    setPartDraftQty(String(part.quantity ?? 1));
  }

  function handleStatusChange(nextStatus: string) {
    if (!order || nextStatus === order.status || isOrderLocked) {
      return;
    }
    if (nextStatus === 'cancelled' && !window.confirm(t('repair.cancelOrderConfirm'))) {
      return;
    }
    changeStatusMutation.mutate({ status: nextStatus });
  }

  if (orderQuery.isLoading && !order) {
    return (
      <section className="repair-order-state tech-glass-panel">
        <p className="eyebrow">{t('repair.module')}</p>
        <h1>{t('repair.orderTitle', { code: id })}</h1>
        <p>{t('home.loading')}</p>
      </section>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <section className="repair-order-state tech-glass-panel">
        <p className="eyebrow">{t('repair.module')}</p>
        <h1>{t('repair.orderTitle', { code: id })}</h1>
        <div className="notice error">{t('repair.loadFailed')}</div>
      </section>
    );
  }

  return (
    <div className="repair-order-page">
      <Link to="/repair/orders" className="repair-order-back-link">
        <ArrowLeft size={18} />
        <span>{t('repair.backToOrders')}</span>
      </Link>

      {feedback ? <div className={`notice ${feedback.tone === 'error' ? 'error' : ''}`}>{feedback.message}</div> : null}
      {isOrderLocked ? <div className="notice">{t('repair.lockedForEditing')}</div> : null}

      <section className="repair-order-hero tech-glass-panel">
        <div className="repair-order-hero-copy">
          <p className="eyebrow">{t('repair.module')}</p>
          <h1>{t('repair.orderTitle', { code: order.order_code ?? id })}</h1>
          <p className="repair-order-hero-text">{t('repair.heroText')}</p>
          <div className="repair-order-badges">
            <Badge tone={getStatusTone(order.status)}>{formatStatusLabel(order.status)}</Badge>
            {order.customer_code ? <Badge>{order.customer_code}</Badge> : null}
            <Badge tone="info">
              {t('repair.pendingLines')}: {pendingLineCount.toLocaleString(locale)}
            </Badge>
            <Badge tone="success">
              {t('repair.total')}: {formatMoney(pendingTotal)}
            </Badge>
          </div>
        </div>

        <div className="repair-order-actions">
          <p className="repair-order-section-label">{t('repair.quickActions')}</p>
          <div className="actions">
            <Button
              type="button"
              variant="secondary"
              icon={<ShoppingCart size={16} />}
              disabled={order.status === 'cancelled'}
              onClick={() => navigate(`/sales/pos?repairOrderId=${id}`)}
            >
              {t('repair.openInPos')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={<Printer size={16} />}
              onClick={() => navigate(`/repair/orders/${id}/receipt`)}
            >
              {t('repair.viewReceipt')}
            </Button>
          </div>
        </div>
      </section>

      <section className="repair-order-metrics">
        <article className="repair-order-metric tech-glass-panel">
          <strong>{services.length.toLocaleString(locale)}</strong>
          <span>{t('repair.serviceCount')}</span>
        </article>
        <article className="repair-order-metric tech-glass-panel">
          <strong>{parts.length.toLocaleString(locale)}</strong>
          <span>{t('repair.partCount')}</span>
        </article>
        <article className="repair-order-metric tech-glass-panel">
          <strong>{pendingLineCount.toLocaleString(locale)}</strong>
          <span>{t('repair.pendingLines')}</span>
        </article>
        <article className="repair-order-metric tech-glass-panel">
          <strong>{billedLineCount.toLocaleString(locale)}</strong>
          <span>{t('repair.billedLines')}</span>
        </article>
      </section>

      <section className="repair-order-layout">
        <div className="repair-order-main">
          <article className="repair-order-card tech-glass-panel">
            <div className="repair-order-card-header">
              <div className="repair-order-card-title">
                <Wrench size={20} />
                <div>
                  <h2>{t('repair.services')}</h2>
                  <p>{t('repair.servicesSection')}</p>
                </div>
              </div>
              <Badge tone="info">{services.length.toLocaleString(locale)}</Badge>
            </div>

            <ul className="repair-line-list">
              {services.length ? (
                services.map((service: any) => {
                  const isEditing = editingServiceId === Number(service.id);
                  const lineTotal = Number(service.quantity ?? 0) * Number(service.unit_price_snapshot ?? 0);

                  return (
                    <li key={service.id} className="repair-line-item">
                      {isEditing && serviceDraft ? (
                        <div className="repair-line-editor">
                          <Input
                            label={t('repair.serviceName')}
                            value={serviceDraft.serviceName}
                            onChange={(event) => setServiceDraft((current) => (current ? { ...current, serviceName: event.target.value } : current))}
                          />
                          <Input
                            label={t('repair.qty')}
                            type="number"
                            min={0.0001}
                            step="0.0001"
                            value={serviceDraft.quantity}
                            onChange={(event) => setServiceDraft((current) => (current ? { ...current, quantity: event.target.value } : current))}
                          />
                          <Input
                            label={t('repair.unitPrice')}
                            type="number"
                            min={0}
                            step="0.01"
                            value={serviceDraft.unitPrice}
                            onChange={(event) => setServiceDraft((current) => (current ? { ...current, unitPrice: event.target.value } : current))}
                          />
                        </div>
                      ) : (
                        <div className="repair-line-copy">
                          <strong>{service.service_name_snapshot}</strong>
                          <div className="repair-line-meta">
                            <span>
                              {formatQuantity(service.quantity)} x {formatMoney(service.unit_price_snapshot)}
                            </span>
                            <span className="repair-line-total">{formatMoney(lineTotal)}</span>
                          </div>
                          {service.sales_invoice_id ? <Badge tone="success">{t('repair.billed')}</Badge> : null}
                        </div>
                      )}

                      <div className="repair-line-actions">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              disabled={updateServiceMutation.isPending}
                              onClick={() => {
                                const validationMessage = validateServiceDraft();
                                if (validationMessage) {
                                  setFeedback({ tone: 'error', message: validationMessage });
                                  return;
                                }
                                if (!serviceDraft) {
                                  return;
                                }
                                updateServiceMutation.mutate({
                                  serviceId: Number(service.id),
                                  payload: serviceDraft,
                                });
                              }}
                            >
                              {t('repair.saveChanges')}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setEditingServiceId(null);
                                setServiceDraft(null);
                              }}
                            >
                              {t('repair.cancelEdit')}
                            </Button>
                          </>
                        ) : (
                          <>
                            {canManageService(service) ? (
                              <Button type="button" variant="secondary" onClick={() => beginEditService(service)}>
                                {t('repair.editService')}
                              </Button>
                            ) : null}
                            {canManageService(service) ? (
                              <Button
                                type="button"
                                variant="danger"
                                disabled={removeServiceMutation.isPending}
                                onClick={() => {
                                  if (!window.confirm(t('repair.removeServiceConfirm'))) {
                                    return;
                                  }
                                  removeServiceMutation.mutate(Number(service.id));
                                }}
                              >
                                {t('repair.removeService')}
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="repair-line-empty">{t('repair.noServices')}</li>
              )}
            </ul>

            <div className="repair-order-composer">
              <div className="repair-order-add-grid">
                <Input label={t('repair.serviceName')} value={serviceName} onChange={(event) => setServiceName(event.target.value)} />
                <Input
                  label={t('repair.qty')}
                  type="number"
                  min={0.0001}
                  step="0.0001"
                  value={serviceQty}
                  onChange={(event) => setServiceQty(event.target.value)}
                />
                <Input
                  label={t('repair.unitPrice')}
                  type="number"
                  min={0}
                  step="0.01"
                  value={serviceUnitPrice}
                  onChange={(event) => setServiceUnitPrice(event.target.value)}
                />
              </div>
              <div className="actions">
                <Button
                  type="button"
                  disabled={isOrderLocked || addServiceMutation.isPending}
                  onClick={() => {
                    const validationMessage = validateNewService();
                    if (validationMessage) {
                      setFeedback({ tone: 'error', message: validationMessage });
                      return;
                    }
                    addServiceMutation.mutate({
                      serviceName: serviceName.trim(),
                      quantity: Number(serviceQty),
                      unitPrice: Number(serviceUnitPrice),
                    });
                  }}
                >
                  {t('repair.addService')}
                </Button>
              </div>
            </div>
          </article>

          <article className="repair-order-card tech-glass-panel">
            <div className="repair-order-card-header">
              <div className="repair-order-card-title">
                <Package size={20} />
                <div>
                  <h2>{t('repair.parts')}</h2>
                  <p>{t('repair.partsSection')}</p>
                </div>
              </div>
              <Badge tone="info">{parts.length.toLocaleString(locale)}</Badge>
            </div>

            <ul className="repair-line-list">
              {parts.length ? (
                parts.map((part: any) => {
                  const isEditing = editingPartId === Number(part.id);
                  const lineTotal = Number(part.quantity ?? 0) * Number(part.current_sale_price ?? 0);

                  return (
                    <li key={part.id} className="repair-line-item">
                      <div className="repair-line-copy">
                        <strong>{part.product_name_snapshot}</strong>
                        <div className="repair-line-meta">
                          {part.product_sku ? <span>{part.product_sku}</span> : null}
                          <span>
                            {formatQuantity(part.quantity)} x {formatMoney(part.current_sale_price)}
                          </span>
                          <span className="repair-line-total">{formatMoney(lineTotal)}</span>
                        </div>
                        <div className="repair-line-badges">
                          {part.sales_invoice_id ? <Badge tone="success">{t('repair.billed')}</Badge> : null}
                          {getReservationStatusLabel(part.reservation_status) ? (
                            <Badge tone={part.reservation_status === 'active' ? 'info' : 'warning'}>
                              {getReservationStatusLabel(part.reservation_status)}
                            </Badge>
                          ) : null}
                        </div>
                        {isEditing ? (
                          <div className="repair-line-editor repair-line-editor-compact">
                            <Input
                              label={t('repair.qty')}
                              type="number"
                              min={0.0001}
                              step="0.0001"
                              value={partDraftQty}
                              onChange={(event) => setPartDraftQty(event.target.value)}
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="repair-line-actions">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              disabled={updatePartMutation.isPending}
                              onClick={() => {
                                const validationMessage = validatePartDraft(part);
                                if (validationMessage) {
                                  setFeedback({ tone: 'error', message: validationMessage });
                                  return;
                                }
                                updatePartMutation.mutate({
                                  partId: Number(part.id),
                                  quantity: Number(partDraftQty),
                                });
                              }}
                            >
                              {t('repair.saveChanges')}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setEditingPartId(null);
                                setPartDraftQty('');
                              }}
                            >
                              {t('repair.cancelEdit')}
                            </Button>
                          </>
                        ) : (
                          <>
                            {canManagePart(part) ? (
                              <Button type="button" variant="secondary" onClick={() => beginEditPart(part)}>
                                {t('repair.editPart')}
                              </Button>
                            ) : null}
                            {canManagePart(part) ? (
                              <Button
                                type="button"
                                variant="danger"
                                disabled={removePartMutation.isPending}
                                onClick={() => {
                                  if (!window.confirm(t('repair.removePartConfirm'))) {
                                    return;
                                  }
                                  removePartMutation.mutate(Number(part.id));
                                }}
                              >
                                {t('repair.removePart')}
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="repair-line-empty">{t('repair.noParts')}</li>
              )}
            </ul>

            <div className="repair-order-composer">
              {partError ? <div className="notice error">{partError}</div> : null}
              <SearchInput
                placeholder={t('repair.searchProducts')}
                value={productSearch}
                onChange={(event) => setProductSearch((event.target as HTMLInputElement).value)}
              />
              <div className="repair-order-add-grid">
                <Select
                  value={String(partProductId)}
                  onChange={(event) => setPartProductId(Number(event.target.value) || '')}
                  label={t('repair.partProduct')}
                >
                  <option value="">{t('repair.selectProduct')}</option>
                  {repairProducts.map((product: any) => (
                    <option key={product.id} value={product.id} disabled={!hasAvailableStock(product)}>
                      {product.sku} {product.default_name} - {t('sales.fields.available')}: {getAvailableQuantity(product)}
                    </option>
                  ))}
                </Select>
                <Input
                  label={t('repair.qty')}
                  type="number"
                  min={0.0001}
                  step="0.0001"
                  value={String(partQty)}
                  onChange={(event) => setPartQty(Number(event.target.value))}
                />
              </div>
              <div className="actions">
                <Button
                  type="button"
                  disabled={isOrderLocked || addPartMutation.isPending || (selectedProduct ? !hasAvailableStock(selectedProduct) : false)}
                  onClick={() => {
                    const validationMessage = validatePartSelection();
                    if (validationMessage) {
                      setPartError(validationMessage);
                      setFeedback({ tone: 'error', message: validationMessage });
                      return;
                    }
                    setPartError('');
                    addPartMutation.mutate({ productId: Number(partProductId), quantity: Number(partQty) });
                  }}
                >
                  {t('repair.addPart')}
                </Button>
              </div>
              {reservationResult ? (
                <div className="notice">
                  {t('repair.reservationCreated', {
                    reservationId: reservationResult.part?.reservation_id ?? reservationResult.part?.reservationId ?? 'n/a',
                    quantity: reservationResult.part?.quantity ?? 'n/a',
                  })}
                </div>
              ) : null}
            </div>
          </article>

          <article className="repair-order-card tech-glass-panel">
            <div className="repair-order-card-header">
              <div className="repair-order-card-title">
                <NotebookPen size={20} />
                <div>
                  <h2>{t('repair.notes')}</h2>
                  <p>{t('repair.notePlaceholder')}</p>
                </div>
              </div>
            </div>

            {notes.length ? (
              <ul className="repair-order-note-list">
                {notes.map((note: any) => (
                  <li key={note.id} className="repair-order-note">
                    <p>{note.note_text}</p>
                    <time>{formatDateTime(note.created_at)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="repair-order-empty">{t('repair.noNotes')}</div>
            )}

            <form onSubmit={form.handleSubmit((values) => addNoteMutation.mutate({ noteText: values.noteText }))} className="repair-order-composer">
              <Textarea
                rows={4}
                placeholder={t('repair.notePlaceholder')}
                {...form.register('noteText', { required: true, minLength: 3 })}
              />
              <div className="actions">
                <Button type="submit" disabled={addNoteMutation.isPending}>
                  {t('repair.addNote')}
                </Button>
              </div>
            </form>
          </article>
        </div>

        <aside className="repair-order-sidebar">
          <article className="repair-order-card tech-glass-panel">
            <div className="repair-order-card-header">
              <div className="repair-order-card-title">
                <ClipboardCheck size={20} />
                <div>
                  <h2>{t('repair.statusWorkflow')}</h2>
                  <p>{t('repair.statusWorkflowHint')}</p>
                </div>
              </div>
            </div>

            <div className="repair-order-status-form">
              <Select
                value={order.status ?? 'new'}
                label={t('repair.status')}
                disabled={changeStatusMutation.isPending || isOrderLocked}
                onChange={(event) => handleStatusChange(event.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </Select>

              <div className="repair-order-inline-actions">
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Wrench size={16} />}
                  disabled={changeStatusMutation.isPending || isOrderLocked || order.status === 'in_repair'}
                  onClick={() => handleStatusChange('in_repair')}
                >
                  {formatStatusLabel('in_repair')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  icon={<CheckCircle2 size={16} />}
                  disabled={changeStatusMutation.isPending || isOrderLocked || order.status === 'ready_for_delivery'}
                  onClick={() => handleStatusChange('ready_for_delivery')}
                >
                  {t('repair.markReady')}
                </Button>
                <Button
                  type="button"
                  icon={<Truck size={16} />}
                  disabled={changeStatusMutation.isPending || isOrderLocked || order.status === 'delivered'}
                  onClick={() => handleStatusChange('delivered')}
                >
                  {t('repair.markDelivered')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={changeStatusMutation.isPending || isOrderLocked || order.status === 'cancelled'}
                  onClick={() => handleStatusChange('cancelled')}
                >
                  {formatStatusLabel('cancelled')}
                </Button>
              </div>

              <Button
                type="button"
                variant="danger"
                icon={<Trash2 size={16} />}
                disabled={deleteOrderMutation.isPending}
                onClick={() => {
                  if (!window.confirm(t('repair.deleteOrderConfirm'))) {
                    return;
                  }
                  deleteOrderMutation.mutate();
                }}
              >
                {t('repair.deleteOrder')}
              </Button>
            </div>
          </article>

          <article className="repair-order-card tech-glass-panel">
            <div className="repair-order-card-header">
              <div className="repair-order-card-title">
                <Cpu size={20} />
                <div>
                  <h2>{t('repair.summary')}</h2>
                  <p>{t('repair.deviceSection')}</p>
                </div>
              </div>
              <Badge tone={getStatusTone(order.status)}>{formatStatusLabel(order.status)}</Badge>
            </div>

            <dl className="repair-order-summary-list">
              <div className="repair-order-summary-item">
                <dt>{t('repair.customer')}</dt>
                <dd>
                  {order.customer_name ?? order.customer_id}
                  {order.customer_code ? <span>{order.customer_code}</span> : null}
                </dd>
              </div>
              <div className="repair-order-summary-item">
                <dt>{t('repair.device')}</dt>
                <dd>
                  {order.device_name ?? order.device_id}
                  {deviceMeta ? <span>{deviceMeta}</span> : null}
                </dd>
              </div>
              <div className="repair-order-summary-item">
                <dt>{t('repair.createdAt')}</dt>
                <dd>{formatDateTime(order.created_at)}</dd>
              </div>
              <div className="repair-order-summary-item">
                <dt>{t('repair.updatedAt')}</dt>
                <dd>{formatDateTime(order.updated_at)}</dd>
              </div>
              <div className="repair-order-summary-item">
                <dt>{t('repair.problem')}</dt>
                <dd>{order.problem_description || '-'}</dd>
              </div>
              <div className="repair-order-summary-item">
                <dt>{t('repair.intakeNotes')}</dt>
                <dd>{order.intake_notes || '-'}</dd>
              </div>
            </dl>
          </article>

          <article className="repair-order-card tech-glass-panel">
            <div className="repair-order-card-header">
              <div className="repair-order-card-title">
                <ShoppingCart size={20} />
                <div>
                  <h2>{t('repair.billingSummary')}</h2>
                  <p>{t('repair.totals')}</p>
                </div>
              </div>
            </div>

            <dl className="repair-order-summary-list">
              <div className="repair-order-summary-item">
                <dt>{t('repair.serviceCount')}</dt>
                <dd>{services.length.toLocaleString(locale)}</dd>
              </div>
              <div className="repair-order-summary-item">
                <dt>{t('repair.partCount')}</dt>
                <dd>{parts.length.toLocaleString(locale)}</dd>
              </div>
              <div className="repair-order-summary-item">
                <dt>{t('repair.pendingLines')}</dt>
                <dd>{pendingLineCount.toLocaleString(locale)}</dd>
              </div>
              <div className="repair-order-summary-item">
                <dt>{t('repair.billedLines')}</dt>
                <dd>{billedLineCount.toLocaleString(locale)}</dd>
              </div>
              <div className="repair-order-summary-item">
                <dt>{t('repair.total')}</dt>
                <dd>{formatMoney(pendingTotal)}</dd>
              </div>
            </dl>
          </article>

          <article className="repair-order-card tech-glass-panel">
            <div className="repair-order-card-header">
              <div className="repair-order-card-title">
                <History size={20} />
                <div>
                  <h2>{t('repair.history')}</h2>
                  <p>{t('repair.historyHint')}</p>
                </div>
              </div>
            </div>

            {history.length ? (
              <ul className="repair-order-history-list">
                {history.map((entry: any) => (
                  <li key={entry.id} className="repair-order-history-item">
                    <div className="repair-order-history-head">
                      <Badge tone={getStatusTone(entry.new_status)}>{formatStatusLabel(entry.new_status)}</Badge>
                      <span className="repair-order-history-meta">{formatDateTime(entry.changed_at)}</span>
                    </div>
                    <p className="repair-order-history-transition">
                      {entry.old_status
                        ? `${formatStatusLabel(entry.old_status)} -> ${formatStatusLabel(entry.new_status)}`
                        : formatStatusLabel(entry.new_status)}
                    </p>
                    {entry.note ? <p>{entry.note}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="repair-order-empty">{t('repair.noHistory')}</div>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
