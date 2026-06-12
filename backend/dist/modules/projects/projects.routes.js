import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { parseId } from '../../shared/http/ids.js';
import { parsePagination } from '../../shared/http/pagination.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { installedAssetSchema, projectCreateSchema, projectMaterialSchema, projectNoteSchema, projectSiteSchema, projectStatusChangeSchema, projectTypeSchema, } from './projects.schemas.js';
import { ProjectsService } from './projects.service.js';
const router = Router();
const projects = new ProjectsService();
router.use(requireAuth);
router.get('/projects/types', requirePermission('projects.view'), asyncHandler(async (_req, res) => {
    res.json({ items: await projects.listTypes() });
}));
router.post('/projects/types', requirePermission('projects.create'), asyncHandler(async (req, res) => {
    res.status(201).json({ projectType: await projects.createType(projectTypeSchema.parse(req.body), req.currentUser.id) });
}));
router.get('/projects', requirePermission('projects.view'), asyncHandler(async (req, res) => {
    const { pageSize, offset } = parsePagination(req.query);
    res.json({ items: await projects.listProjects({ offset, limit: pageSize }) });
}));
router.post('/projects', requirePermission('projects.create'), asyncHandler(async (req, res) => {
    res.status(201).json({ project: await projects.createProject(projectCreateSchema.parse(req.body), req.currentUser.id, req.ip) });
}));
router.get('/projects/:id', requirePermission('projects.view'), asyncHandler(async (req, res) => {
    res.json({ project: await projects.getProject(parseId(req.params.id)) });
}));
router.get('/projects/:id/billing', requirePermission('projects.view'), asyncHandler(async (req, res) => {
    res.json({ billing: await projects.getProjectBilling(parseId(req.params.id)) });
}));
router.post('/projects/:id/sites', requirePermission('projects.update'), asyncHandler(async (req, res) => {
    res.status(201).json({ site: await projects.addSite(parseId(req.params.id), projectSiteSchema.parse(req.body), req.currentUser.id, req.ip) });
}));
router.post('/projects/:id/status', requirePermission('projects.update'), asyncHandler(async (req, res) => {
    res.json({ project: await projects.changeStatus(parseId(req.params.id), projectStatusChangeSchema.parse(req.body), req.currentUser.id, req.ip) });
}));
router.post('/projects/:id/materials', requirePermission('projects.materials.reserve'), asyncHandler(async (req, res) => {
    res.status(201).json({ material: await projects.addMaterial(parseId(req.params.id), projectMaterialSchema.parse(req.body), req.currentUser.id, req.ip) });
}));
router.post('/projects/:id/assets', requirePermission('projects.update'), asyncHandler(async (req, res) => {
    res.status(201).json({ asset: await projects.addInstalledAsset(parseId(req.params.id), installedAssetSchema.parse(req.body), req.currentUser.id, req.ip) });
}));
router.post('/projects/:id/notes', requirePermission('projects.update'), asyncHandler(async (req, res) => {
    res.status(201).json({ note: await projects.addNote(parseId(req.params.id), projectNoteSchema.parse(req.body), req.currentUser.id) });
}));
router.get('/projects/:id/summary', requirePermission('projects.view'), asyncHandler(async (req, res) => {
    res.json({ summary: await projects.summary(parseId(req.params.id)) });
}));
export { router as projectsRouter };
