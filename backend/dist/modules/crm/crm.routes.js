import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { parsePagination } from '../../shared/http/pagination.js';
import { resolveRequestLanguage } from '../../shared/localization/requestLanguage.js';
import { CrmService } from './crm.service.js';
import { contactCreateSchema, customerCreateSchema, customerUpdateSchema, locationCreateSchema, noteCreateSchema } from './crm.schemas.js';
const router = Router();
const crmService = new CrmService();
const CUSTOMER_SORT_MODES = new Set(['name-asc', 'name-desc', 'code-asc', 'code-desc', 'created-desc', 'created-asc']);
router.use(requireAuth);
router.get('/customers', requirePermission('crm.customers.view'), asyncHandler(async (request, response) => {
    const { page, pageSize, offset } = parsePagination(request.query);
    const requestedSort = typeof request.query.sort === 'string' && CUSTOMER_SORT_MODES.has(request.query.sort)
        ? request.query.sort
        : undefined;
    const result = await crmService.listCustomers({
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
        offset,
        limit: pageSize,
        sort: requestedSort,
        language: resolveRequestLanguage(request),
    });
    response.json({
        items: result.items,
        meta: {
            page,
            pageSize,
            total: result.total,
            totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
        },
    });
}));
router.post('/customers', requirePermission('crm.customers.create'), asyncHandler(async (request, response) => {
    const input = customerCreateSchema.parse(request.body);
    const customer = await crmService.createCustomer(input, request.currentUser.id, request.ip, resolveRequestLanguage(request));
    response.status(201).json({ customer });
}));
router.get('/customers/:id', requirePermission('crm.customers.view'), asyncHandler(async (request, response) => {
    const customer = await crmService.getCustomer(parseId(request.params.id), resolveRequestLanguage(request));
    response.json({ customer });
}));
router.patch('/customers/:id', requirePermission('crm.customers.update'), asyncHandler(async (request, response) => {
    const input = customerUpdateSchema.parse(request.body);
    const customer = await crmService.updateCustomer(parseId(request.params.id), input, request.currentUser.id, request.ip, resolveRequestLanguage(request));
    response.json({ customer });
}));
router.delete('/customers/:id', requirePermission('crm.customers.update'), asyncHandler(async (request, response) => {
    await crmService.deleteCustomer(parseId(request.params.id), request.currentUser.id, request.ip, resolveRequestLanguage(request));
    response.status(204).send();
}));
router.post('/customers/:id/contacts', requirePermission('crm.customers.update'), asyncHandler(async (request, response) => {
    const contact = await crmService.createContact(parseId(request.params.id), contactCreateSchema.parse(request.body), resolveRequestLanguage(request));
    response.status(201).json({ contact });
}));
router.post('/customers/:id/locations', requirePermission('crm.customers.update'), asyncHandler(async (request, response) => {
    const location = await crmService.createLocation(parseId(request.params.id), locationCreateSchema.parse(request.body), resolveRequestLanguage(request));
    response.status(201).json({ location });
}));
router.post('/customers/:id/notes', requirePermission('crm.customers.notes.manage'), asyncHandler(async (request, response) => {
    const note = await crmService.createNote(parseId(request.params.id), noteCreateSchema.parse(request.body), request.currentUser.id, resolveRequestLanguage(request));
    response.status(201).json({ note });
}));
export { router as crmRouter };
