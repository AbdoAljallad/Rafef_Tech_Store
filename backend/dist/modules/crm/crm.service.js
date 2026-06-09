import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { CrmRepository } from './crm.repository.js';
export class CrmService {
    crmRepository;
    auditService;
    constructor(crmRepository = new CrmRepository(), auditService = new AuditService()) {
        this.crmRepository = crmRepository;
        this.auditService = auditService;
    }
    async listCustomers(params) {
        const [items, total] = await Promise.all([
            this.crmRepository.listCustomers(params),
            this.crmRepository.countCustomers({ search: params.search }),
        ]);
        return { items, total };
    }
    async getCustomer(id) {
        const customer = await this.crmRepository.findCustomerDetailById(id);
        if (!customer) {
            throw new AppError(404, 'NOT_FOUND', 'Customer not found');
        }
        return customer;
    }
    async createCustomer(input, actorUserId, ipAddress) {
        const customer = await this.crmRepository.createCustomer(input, actorUserId);
        if (!customer) {
            throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create customer');
        }
        await this.auditService.log({
            actorUserId,
            actionCode: 'crm.customer.created',
            module: 'crm',
            entityType: 'crm_customers',
            entityId: customer.id,
            newValues: input,
            ipAddress,
        });
        return customer;
    }
    async updateCustomer(id, input, actorUserId, ipAddress) {
        const before = await this.getCustomer(id);
        const customer = await this.crmRepository.updateCustomer(id, input, actorUserId);
        if (!customer) {
            throw new AppError(404, 'NOT_FOUND', 'Customer not found');
        }
        await this.auditService.log({
            actorUserId,
            actionCode: 'crm.customer.updated',
            module: 'crm',
            entityType: 'crm_customers',
            entityId: id,
            oldValues: before,
            newValues: input,
            ipAddress,
        });
        return customer;
    }
    async deleteCustomer(id, actorUserId, ipAddress) {
        const before = await this.getCustomer(id);
        const deleted = await this.crmRepository.softDeleteCustomer(id, actorUserId);
        if (!deleted) {
            throw new AppError(404, 'NOT_FOUND', 'Customer not found');
        }
        await this.auditService.log({
            actorUserId,
            actionCode: 'crm.customer.deleted',
            module: 'crm',
            entityType: 'crm_customers',
            entityId: id,
            oldValues: before,
            newValues: { isActive: false },
            ipAddress,
        });
    }
    async createContact(customerId, input) {
        await this.getCustomer(customerId);
        return this.crmRepository.createContact(customerId, input);
    }
    async createLocation(customerId, input) {
        await this.getCustomer(customerId);
        return this.crmRepository.createLocation(customerId, input);
    }
    async createNote(customerId, input, actorUserId) {
        await this.getCustomer(customerId);
        return this.crmRepository.createNote(customerId, input.noteText, actorUserId);
    }
}
