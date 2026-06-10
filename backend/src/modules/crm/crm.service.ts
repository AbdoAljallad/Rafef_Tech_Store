import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { CrmRepository } from './crm.repository.js';
import type { ContactCreateInput, CustomerCreateInput, CustomerUpdateInput, LocationCreateInput, NoteCreateInput } from './crm.schemas.js';

type CustomerSortMode = 'name-asc' | 'name-desc' | 'code-asc' | 'code-desc' | 'created-desc' | 'created-asc';

const textCollators = {
  ar: new Intl.Collator('ar', { sensitivity: 'base', numeric: true, ignorePunctuation: true }),
  en: new Intl.Collator('en', { sensitivity: 'base', numeric: true, ignorePunctuation: true }),
  ru: new Intl.Collator('ru', { sensitivity: 'base', numeric: true, ignorePunctuation: true }),
  generic: new Intl.Collator(undefined, { sensitivity: 'base', numeric: true, ignorePunctuation: true }),
};

function normalizeSortValue(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .replace(/^[^\p{Letter}\p{Number}]+/gu, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim();
}

function getScriptPriority(value: string) {
  const normalized = normalizeSortValue(value);

  for (const char of normalized) {
    if (/\p{Script=Arabic}/u.test(char)) {
      return 0;
    }

    if (/\p{Script=Latin}/u.test(char)) {
      return 1;
    }

    if (/\p{Script=Cyrillic}/u.test(char)) {
      return 2;
    }

    if (/\p{Number}/u.test(char)) {
      return 3;
    }

    if (/\p{Letter}/u.test(char)) {
      return 4;
    }
  }

  return 5;
}

function compareTextByLanguagePriority(leftValue: string, rightValue: string, direction: 'asc' | 'desc' = 'asc') {
  const left = normalizeSortValue(leftValue);
  const right = normalizeSortValue(rightValue);
  const leftPriority = getScriptPriority(left);
  const rightPriority = getScriptPriority(right);

  let result = 0;

  if (leftPriority !== rightPriority) {
    result = leftPriority - rightPriority;
  } else {
    const collator =
      leftPriority === 0 ? textCollators.ar :
      leftPriority === 1 ? textCollators.en :
      leftPriority === 2 ? textCollators.ru :
      textCollators.generic;

    result = collator.compare(left, right);

    if (result === 0) {
      result = textCollators.generic.compare(left, right);
    }
  }

  return direction === 'asc' ? result : -result;
}

function compareCustomers(
  left: { name: string; customer_code: string; created_at: Date },
  right: { name: string; customer_code: string; created_at: Date },
  sortMode: CustomerSortMode,
) {
  switch (sortMode) {
    case 'name-asc':
      return compareTextByLanguagePriority(left.name, right.name, 'asc');
    case 'name-desc':
      return compareTextByLanguagePriority(left.name, right.name, 'desc');
    case 'code-asc':
      return textCollators.generic.compare(left.customer_code, right.customer_code);
    case 'code-desc':
      return textCollators.generic.compare(right.customer_code, left.customer_code);
    case 'created-asc':
      return left.created_at.getTime() - right.created_at.getTime();
    case 'created-desc':
    default:
      return right.created_at.getTime() - left.created_at.getTime();
  }
}

export class CrmService {
  constructor(
    private readonly crmRepository = new CrmRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  async listCustomers(params: { search?: string; offset: number; limit: number; sort?: CustomerSortMode }) {
    const items = await this.crmRepository.listCustomers({ search: params.search });
    const sortMode = params.sort ?? 'created-desc';
    const sortedItems = [...items].sort((left, right) => compareCustomers(left, right, sortMode));
    const pageItems = sortedItems.slice(params.offset, params.offset + params.limit);

    return { items: pageItems, total: sortedItems.length };
  }

  async getCustomer(id: number) {
    const customer = await this.crmRepository.findCustomerDetailById(id);
    if (!customer) {
      throw new AppError(404, 'NOT_FOUND', 'Customer not found');
    }

    return customer;
  }

  async createCustomer(input: CustomerCreateInput, actorUserId: number, ipAddress?: string | null) {
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

  async updateCustomer(id: number, input: CustomerUpdateInput, actorUserId: number, ipAddress?: string | null) {
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

  async deleteCustomer(id: number, actorUserId: number, ipAddress?: string | null) {
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
