import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { CrmRepository } from './crm.repository.js';
import type { ContactCreateInput, CustomerCreateInput, CustomerUpdateInput, LocationCreateInput, NoteCreateInput } from './crm.schemas.js';

export class CrmService {
  constructor(
    private readonly crmRepository = new CrmRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  async listCustomers(params: { search?: string; offset: number; limit: number }) {
    const [items, total] = await Promise.all([
      this.crmRepository.listCustomers(params),
      this.crmRepository.countCustomers({ search: params.search }),
    ]);

    return { items, total };
  }

  async getCustomer(id: number) {
    const customer = await this.crmRepository.findCustomerById(id);
    if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found');
    return customer;
  }

  async createCustomer(input: CustomerCreateInput, actorUserId: number, ipAddress?: string | null) {
    const customer = await this.crmRepository.createCustomer(input, actorUserId);
    if (!customer) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create customer');
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

  async updateCustomer(id: number, input: CustomerUpdateInput, actorUserId: number, ipAddress?: string | null) {
    const before = await this.getCustomer(id);
    const customer = await this.crmRepository.updateCustomer(id, input, actorUserId);
    if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found');
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

  async createContact(customerId: number, input: ContactCreateInput) {
    await this.getCustomer(customerId);
    return this.crmRepository.createContact(customerId, input);
  }

  async createLocation(customerId: number, input: LocationCreateInput) {
    await this.getCustomer(customerId);
    return this.crmRepository.createLocation(customerId, input);
  }

  async createNote(customerId: number, input: NoteCreateInput, actorUserId: number) {
    await this.getCustomer(customerId);
    return this.crmRepository.createNote(customerId, input.noteText, actorUserId);
  }
}
