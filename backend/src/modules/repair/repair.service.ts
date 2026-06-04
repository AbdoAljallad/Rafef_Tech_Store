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
  OrderInput,
  OrderPartInput,
  OrderServiceInput,
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
  listOrders(params: { offset: number; limit: number }) { return this.repo.listOrders(params); }
  async getOrder(id: number) {
    const order = await this.repo.findOrder(id);
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
    return order;
  }
  receipt(id: number) { return this.repo.receipt(id); }

  async createOrder(input: OrderInput, userId: number, ip?: string | null) {
    const order = await this.repo.createOrder(input, userId);
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
  async changeStatus(orderId: number, input: StatusChangeInput, userId: number, ip?: string | null) {
    const order = await this.repo.changeStatus(orderId, input, userId);
    await this.audit.log({ actorUserId: userId, actionCode: 'repair.status.changed', module: 'repair', entityType: 'repair_orders', entityId: orderId, newValues: input, ipAddress: ip });
    await this.events.create({ module: 'repair', eventType: 'repair.status_changed', title: 'Repair status changed', entityType: 'repair_orders', entityId: orderId, actorUserId: userId });
    if (input.status === 'ready_for_delivery') {
      await this.events.create({ module: 'repair', eventType: 'repair.ready', title: 'Repair ready for delivery', entityType: 'repair_orders', entityId: orderId, severity: 'important', actorUserId: userId });
    }
    return order;
  }
  addNote(orderId: number, input: NoteInput, userId: number) { return this.repo.addNote(orderId, input, userId); }
}
