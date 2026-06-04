import { AuditService } from '../audit/audit.service.js';
import { EventService } from '../events/event.service.js';
import { StockReservationService } from '../inventory/stockReservation.service.js';
import { AppError } from '../../shared/errors/AppError.js';
import { RepairRepository } from './repair.repository.js';
export class RepairService {
    repo;
    audit;
    events;
    reservations;
    constructor(repo = new RepairRepository(), audit = new AuditService(), events = new EventService(), reservations = new StockReservationService()) {
        this.repo = repo;
        this.audit = audit;
        this.events = events;
        this.reservations = reservations;
    }
    listCategories() { return this.repo.listCategories(); }
    createCategory(input) { return this.repo.createCategory(input); }
    listBrands() { return this.repo.listBrands(); }
    createBrand(input) { return this.repo.createBrand(input); }
    listModels() { return this.repo.listModels(); }
    createModel(input) { return this.repo.createModel(input); }
    createDevice(input) { return this.repo.createDevice(input); }
    listOrders(params) { return this.repo.listOrders(params); }
    async getOrder(id) {
        const order = await this.repo.findOrder(id);
        if (!order)
            throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
        return order;
    }
    receipt(id) { return this.repo.receipt(id); }
    async createOrder(input, userId, ip) {
        const order = await this.repo.createOrder(input, userId);
        const orderId = Number(order.id);
        await this.audit.log({ actorUserId: userId, actionCode: 'repair.order.created', module: 'repair', entityType: 'repair_orders', entityId: orderId, newValues: input, ipAddress: ip });
        await this.events.create({ module: 'repair', eventType: 'repair.created', title: 'Repair order created', entityType: 'repair_orders', entityId: orderId, actorUserId: userId });
        return order;
    }
    async addService(orderId, input, userId, ip) {
        const service = await this.repo.addService(orderId, input);
        await this.audit.log({ actorUserId: userId, actionCode: 'repair.service.added', module: 'repair', entityType: 'repair_orders', entityId: orderId, newValues: input, ipAddress: ip });
        return service;
    }
    async addPart(orderId, input, userId, ip) {
        await this.repo.requireOrder(orderId);
        await this.repo.requireProduct(input.productId);
        const reservation = await this.reservations.createReservation({ productId: input.productId, quantity: input.quantity, sourceType: 'repair_order', sourceId: orderId, notes: 'Repair part reservation' }, userId, ip);
        const part = await this.repo.addPart(orderId, input, Number(reservation.id));
        await this.audit.log({ actorUserId: userId, actionCode: 'repair.part.reserved', module: 'repair', entityType: 'repair_orders', entityId: orderId, newValues: part, ipAddress: ip });
        return part;
    }
    async changeStatus(orderId, input, userId, ip) {
        const order = await this.repo.changeStatus(orderId, input, userId);
        await this.audit.log({ actorUserId: userId, actionCode: 'repair.status.changed', module: 'repair', entityType: 'repair_orders', entityId: orderId, newValues: input, ipAddress: ip });
        await this.events.create({ module: 'repair', eventType: 'repair.status_changed', title: 'Repair status changed', entityType: 'repair_orders', entityId: orderId, actorUserId: userId });
        if (input.status === 'ready_for_delivery') {
            await this.events.create({ module: 'repair', eventType: 'repair.ready', title: 'Repair ready for delivery', entityType: 'repair_orders', entityId: orderId, severity: 'important', actorUserId: userId });
        }
        return order;
    }
    addNote(orderId, input, userId) { return this.repo.addNote(orderId, input, userId); }
}
