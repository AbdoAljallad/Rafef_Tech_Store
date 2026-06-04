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
    listCustomers(params) {
        return this.crmRepository.listCustomers(params);
    }
    async getCustomer(id) {
        const customer = await this.crmRepository.findCustomerById(id);
        if (!customer)
            throw new AppError(404, 'NOT_FOUND', 'Customer not found');
        return customer;
    }
    async createCustomer(input, actorUserId, ipAddress) {
        const customer = await this.crmRepository.createCustomer(input, actorUserId);
        if (!customer)
            throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create customer');
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
        if (!customer)
            throw new AppError(404, 'NOT_FOUND', 'Customer not found');
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
