import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { parsePagination } from '../../shared/http/pagination.js';
import { CrmService } from './crm.service.js';
import { contactCreateSchema, customerCreateSchema, customerUpdateSchema, locationCreateSchema, noteCreateSchema } from './crm.schemas.js';

const router = Router();
const crmService = new CrmService();

router.use(requireAuth);

router.get(
  '/customers',
  requirePermission('crm.customers.view'),
  asyncHandler(async (request, response) => {
    const { page, pageSize, offset } = parsePagination(request.query);
    const result = await crmService.listCustomers({
      search: typeof request.query.search === 'string' ? request.query.search : undefined,
      offset,
      limit: pageSize,
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
  }),
);

router.post(
  '/customers',
  requirePermission('crm.customers.create'),
  asyncHandler(async (request, response) => {
    const input = customerCreateSchema.parse(request.body);
    const customer = await crmService.createCustomer(input, request.currentUser!.id, request.ip);
    response.status(201).json({ customer });
  }),
);

router.get(
  '/customers/:id',
  requirePermission('crm.customers.view'),
  asyncHandler(async (request, response) => {
    const customer = await crmService.getCustomer(parseId(request.params.id));
    response.json({ customer });
  }),
);

router.patch(
  '/customers/:id',
  requirePermission('crm.customers.update'),
  asyncHandler(async (request, response) => {
    const input = customerUpdateSchema.parse(request.body);
    const customer = await crmService.updateCustomer(parseId(request.params.id), input, request.currentUser!.id, request.ip);
    response.json({ customer });
  }),
);

router.post(
  '/customers/:id/contacts',
  requirePermission('crm.customers.update'),
  asyncHandler(async (request, response) => {
    const contact = await crmService.createContact(parseId(request.params.id), contactCreateSchema.parse(request.body));
    response.status(201).json({ contact });
  }),
);

router.post(
  '/customers/:id/locations',
  requirePermission('crm.customers.update'),
  asyncHandler(async (request, response) => {
    const location = await crmService.createLocation(parseId(request.params.id), locationCreateSchema.parse(request.body));
    response.status(201).json({ location });
  }),
);

router.post(
  '/customers/:id/notes',
  requirePermission('crm.customers.notes.manage'),
  asyncHandler(async (request, response) => {
    const note = await crmService.createNote(parseId(request.params.id), noteCreateSchema.parse(request.body), request.currentUser!.id);
    response.status(201).json({ note });
  }),
);

export { router as crmRouter };
