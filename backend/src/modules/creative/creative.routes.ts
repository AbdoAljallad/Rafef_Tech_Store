import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { CreativeService } from './creative.service.js';
import { jobTypeCreateSchema, vendorCreateSchema, jobCreateSchema, jobLineCreateSchema, vendorTaskCreateSchema, statusChangeSchema } from './creative.schemas.js';

const router = Router();
const svc = new CreativeService();

router.use(requireAuth);

router.get('/creative/job-types', requirePermission('creative.jobs.view'), asyncHandler(async (_req, res) => res.json({ items: await svc.listJobTypes() })));
router.post('/creative/job-types', requirePermission('creative.jobs.create'), asyncHandler(async (req, res) => res.status(201).json({ jobType: await svc.createJobType(jobTypeCreateSchema.parse(req.body)) })));

router.get('/creative/vendors', requirePermission('creative.vendors.manage'), asyncHandler(async (_req, res) => res.json({ items: await svc.listVendors() })));
router.post('/creative/vendors', requirePermission('creative.vendors.manage'), asyncHandler(async (req, res) => res.status(201).json({ vendor: await svc.createVendor(vendorCreateSchema.parse(req.body)) })));

router.get('/creative/jobs', requirePermission('creative.jobs.view'), asyncHandler(async (_req, res) => res.json({ items: await svc.listJobs() })));
router.post('/creative/jobs', requirePermission('creative.jobs.create'), asyncHandler(async (req, res) => res.status(201).json({ job: await svc.createJob(jobCreateSchema.parse(req.body)) })));
router.get('/creative/jobs/:id', requirePermission('creative.jobs.view'), asyncHandler(async (req, res) => res.json({ job: await svc.getJob(parseId(req.params.id)) })));
router.post('/creative/jobs/:id/lines', requirePermission('creative.jobs.update'), asyncHandler(async (req, res) => res.status(201).json({ job: await svc.addJobLine(jobLineCreateSchema.parse({ ...req.body, jobId: parseId(req.params.id) })) })));

router.post('/creative/jobs/:id/vendor-tasks', requirePermission('creative.vendors.manage'), asyncHandler(async (req, res) => res.status(201).json({ task: await svc.createVendorTask(vendorTaskCreateSchema.parse(req.body)) })));

router.post('/creative/jobs/:id/status', requirePermission('creative.jobs.update'), asyncHandler(async (req, res) => {
  const change = statusChangeSchema.parse(req.body);
  const jobId = parseId(req.params.id);
  const job = await svc.getJob(jobId);
  const from = (job as any)?.status ?? null;
  res.json({ job: await svc.changeJobStatus(jobId, from, change.toStatus, change.notes, req.currentUser!.id) });
}));

export { router as creativeRouter };
