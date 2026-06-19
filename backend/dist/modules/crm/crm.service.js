import { AppError } from '../../shared/errors/AppError.js';
import { EntityTranslationService } from '../../shared/localization/entityTranslation.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CrmRepository } from './crm.repository.js';
export class CrmService {
    crmRepository;
    auditService;
    translationService;
    constructor(crmRepository = new CrmRepository(), auditService = new AuditService(), translationService = new EntityTranslationService()) {
        this.crmRepository = crmRepository;
        this.auditService = auditService;
        this.translationService = translationService;
    }
    async listCustomers(params) {
        const [items, total] = await Promise.all([
            this.crmRepository.listCustomers({
                search: params.search,
                language: params.language,
                offset: params.offset,
                limit: params.limit,
                sort: params.sort,
            }),
            this.crmRepository.countCustomers({ search: params.search }),
        ]);
        return { items, total };
    }
    async getCustomer(id, language) {
        const customer = await this.crmRepository.findCustomerDetailById(id, language);
        if (!customer) {
            throw new AppError(404, 'NOT_FOUND', 'Customer not found');
        }
        return customer;
    }
    async createCustomer(input, actorUserId, ipAddress, language) {
        const customer = await this.crmRepository.createCustomer(input, actorUserId, language);
        if (!customer) {
            throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create customer');
        }
        await this.translationService.syncEntityField({
            entityType: 'crm_customers',
            entityId: customer.id,
            fieldName: 'name',
            text: input.name,
            requestedLanguage: language,
        });
        await this.auditService.log({
            actorUserId,
            actionCode: 'crm.customer.created',
            module: 'crm',
            entityType: 'crm_customers',
            entityId: customer.id,
            newValues: input,
            ipAddress,
        });
        return this.getCustomer(customer.id, language);
    }
    async updateCustomer(id, input, actorUserId, ipAddress, language) {
        const before = await this.getCustomer(id, language);
        const customer = await this.crmRepository.updateCustomer(id, input, actorUserId, language);
        if (!customer) {
            throw new AppError(404, 'NOT_FOUND', 'Customer not found');
        }
        if (input.name) {
            await this.translationService.syncEntityField({
                entityType: 'crm_customers',
                entityId: id,
                fieldName: 'name',
                text: input.name,
                requestedLanguage: language,
            });
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
        return this.getCustomer(id, language);
    }
    async deleteCustomer(id, actorUserId, ipAddress, language) {
        const before = await this.getCustomer(id, language);
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
    async createContact(customerId, input, language) {
        await this.getCustomer(customerId, language);
        return this.crmRepository.createContact(customerId, input);
    }
    async createLocation(customerId, input, language) {
        await this.getCustomer(customerId, language);
        return this.crmRepository.createLocation(customerId, input);
    }
    async createNote(customerId, input, actorUserId, language) {
        await this.getCustomer(customerId, language);
        return this.crmRepository.createNote(customerId, input.noteText, actorUserId);
    }
}
