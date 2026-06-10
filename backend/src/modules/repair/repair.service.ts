import { AuditService } from '../audit/audit.service.js';
import { EventService } from '../events/event.service.js';
import { StockReservationService } from '../inventory/stockReservation.service.js';
import { AppError } from '../../shared/errors/AppError.js';
import { RepairRepository } from './repair.repository.js';
import type {
  BrandInput,
  DeviceCategoryInput,
  DeviceInput,
  ModelInput,
  NoteInput,
  OrderDeviceInput,
  OrderInput,
  OrderPartInput,
  OrderPartUpdateInput,
  OrderServiceInput,
  OrderServiceUpdateInput,
  StatusChangeInput,
} from './repair.schemas.js';

export class RepairService {
  constructor(
    private readonly repo = new RepairRepository(),
    private readonly audit = new AuditService(),
    private readonly events = new EventService(),
    private readonly reservations = new StockReservationService(),
  ) {}

  listCategories() { return this.repo.listCategories(); }
  createCategory(input: DeviceCategoryInput) { return this.repo.createCategory(input); }
  listBrands() { return this.repo.listBrands(); }
  createBrand(input: BrandInput) { return this.repo.createBrand(input); }
  listModels() { return this.repo.listModels(); }
  createModel(input: ModelInput) { return this.repo.createModel(input); }
  createDevice(input: DeviceInput) { return this.repo.createDevice(input); }
  listCustomerDevices(customerId: number) { return this.repo.listCustomerDevices(customerId); }
  listOrders(params: { offset: number; limit: number }) { return this.repo.listOrders(params); }
  async getOrder(id: number) {
    const order = await this.repo.findOrder(id);
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
    return order;
  }
  receipt(id: number) { return this.repo.receipt(id); }
  getOrderBilling(id: number) { return this.repo.getOrderBilling(id); }

  async createOrder(input: OrderInput, userId: number, ip?: string | null) {
    const deviceId = await this.resolveOrderDeviceId(input);
    const order = await this.repo.createOrder({ ...input, deviceId }, userId);
    const orderId = Number((order as unknown as { id: number }).id);
    await this.audit.log({ actorUserId: userId, actionCode: 'repair.order.created', module: 'repair', entityType: 'repair_orders', entityId: orderId, newValues: input, ipAddress: ip });
    await this.events.create({ module: 'repair', eventType: 'repair.created', title: 'Repair order created', entityType: 'repair_orders', entityId: orderId, actorUserId: userId });
    return order;
  }
  async addService(orderId: number, input: OrderServiceInput, userId: number, ip?: string | null) {
    const service = await this.repo.addService(orderId, input);
    await this.audit.log({ actorUserId: userId, actionCode: 'repair.service.added', module: 'repair', entityType: 'repair_orders', entityId: orderId, newValues: input, ipAddress: ip });
    return service;
  }
  async addPart(orderId: number, input: OrderPartInput, userId: number, ip?: string | null) {
    await this.repo.requireOrder(orderId);
    await this.repo.requireProduct(input.productId);
    const reservation = await this.reservations.createReservation({ productId: input.productId, quantity: input.quantity, sourceType: 'repair_order', sourceId: orderId, notes: 'Repair part reservation' }, userId, ip);
    const part = await this.repo.addPart(orderId, input, Number(reservation.id));
    await this.audit.log({ actorUserId: userId, actionCode: 'repair.part.reserved', module: 'repair', entityType: 'repair_orders', entityId: orderId, newValues: part, ipAddress: ip });
    return part;
  }
  async updateService(orderId: number, serviceId: number, input: OrderServiceUpdateInput, userId: number, ip?: string | null) {
    const order = await this.repo.updateService(orderId, serviceId, input);
    await this.audit.log({
      actorUserId: userId,
      actionCode: 'repair.service.updated',
      module: 'repair',
      entityType: 'repair_orders',
      entityId: orderId,
      newValues: { serviceId, ...input },
      ipAddress: ip,
    });
    return order;
  }
  async updatePart(orderId: number, partId: number, input: OrderPartUpdateInput, userId: number, ip?: string | null) {
    const order = await this.repo.updatePart(orderId, partId, input, userId);
    await this.audit.log({
      actorUserId: userId,
      actionCode: 'repair.part.updated',
      module: 'repair',
      entityType: 'repair_orders',
      entityId: orderId,
      newValues: { partId, ...input },
      ipAddress: ip,
    });
    return order;
  }
  async removeService(orderId: number, serviceId: number, userId: number, ip?: string | null) {
    const service = await this.repo.removeService(orderId, serviceId);
    await this.audit.log({
      actorUserId: userId,
      actionCode: 'repair.service.removed',
      module: 'repair',
      entityType: 'repair_orders',
      entityId: orderId,
      newValues: service,
      ipAddress: ip,
    });
  }
  async removePart(orderId: number, partId: number, userId: number, ip?: string | null) {
    const result = await this.repo.removePart(orderId, partId, userId);
    await this.audit.log({
      actorUserId: userId,
      actionCode: 'repair.part.removed',
      module: 'repair',
      entityType: 'repair_orders',
      entityId: orderId,
      newValues: result.part,
      ipAddress: ip,
    });
    if (result.releasedReservation) {
      await this.audit.log({
        actorUserId: userId,
        actionCode: 'inventory.reservation.released',
        module: 'inventory',
        entityType: 'inventory_stock_reservations',
        entityId: result.releasedReservation.reservationId,
        newValues: result.releasedReservation,
        ipAddress: ip,
      });
    }
  }
  async changeStatus(orderId: number, input: StatusChangeInput, userId: number, ip?: string | null) {
    const result = await this.repo.changeStatus(orderId, input, userId);
    await this.audit.log({ actorUserId: userId, actionCode: 'repair.status.changed', module: 'repair', entityType: 'repair_orders', entityId: orderId, newValues: input, ipAddress: ip });
    for (const reservation of result.releasedReservations) {
      await this.audit.log({
        actorUserId: userId,
        actionCode: 'inventory.reservation.released',
        module: 'inventory',
        entityType: 'inventory_stock_reservations',
        entityId: reservation.reservationId,
        newValues: reservation,
        ipAddress: ip,
      });
    }
    await this.events.create({ module: 'repair', eventType: 'repair.status_changed', title: 'Repair status changed', entityType: 'repair_orders', entityId: orderId, actorUserId: userId });
    if (input.status === 'ready_for_delivery') {
      await this.events.create({ module: 'repair', eventType: 'repair.ready', title: 'Repair ready for delivery', entityType: 'repair_orders', entityId: orderId, severity: 'important', actorUserId: userId });
    }
    return result.order;
  }
  async deleteOrder(orderId: number, userId: number, ip?: string | null) {
    const result = await this.repo.deleteOrder(orderId, userId);
    await this.audit.log({
      actorUserId: userId,
      actionCode: 'repair.order.deleted',
      module: 'repair',
      entityType: 'repair_orders',
      entityId: orderId,
      newValues: result,
      ipAddress: ip,
    });
    for (const reservation of result.releasedReservations) {
      await this.audit.log({
        actorUserId: userId,
        actionCode: 'inventory.reservation.released',
        module: 'inventory',
        entityType: 'inventory_stock_reservations',
        entityId: reservation.reservationId,
        newValues: reservation,
        ipAddress: ip,
      });
    }
    await this.events.create({
      module: 'repair',
      eventType: 'repair.deleted',
      title: 'Repair order deleted',
      entityType: 'repair_orders',
      entityId: orderId,
      severity: 'important',
      actorUserId: userId,
    });
    return result;
  }
  addNote(orderId: number, input: NoteInput, userId: number) { return this.repo.addNote(orderId, input, userId); }

  private async resolveOrderDeviceId(input: OrderInput) {
    if (input.deviceId) {
      return input.deviceId;
    }

    if (!input.newDevice) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Device is required');
    }

    const device = await this.repo.createDevice({
      customerId: input.customerId,
      ...this.normalizeOrderDevice(input.newDevice),
    });
    const createdId = Number((device as { id?: number } | null)?.id);
    if (!createdId) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create repair device');
    }
    return createdId;
  }

  private normalizeOrderDevice(input: OrderDeviceInput) {
    return {
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      modelId: input.modelId ?? null,
      deviceName: input.deviceName,
      serialNo: input.serialNo ?? null,
      imei: input.imei ?? null,
      notes: input.notes ?? null,
    };
  }
}
