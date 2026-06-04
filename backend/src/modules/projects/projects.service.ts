import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { EventService } from '../events/event.service.js';
import { StockReservationService } from '../inventory/stockReservation.service.js';
import { ProjectsRepository } from './projects.repository.js';
import type {
  InstalledAssetInput,
  ProjectCreateInput,
  ProjectMaterialInput,
  ProjectNoteInput,
  ProjectSiteInput,
  ProjectStatusChangeInput,
  ProjectTypeInput,
} from './projects.schemas.js';

export class ProjectsService {
  constructor(
    private readonly repo = new ProjectsRepository(),
    private readonly audit = new AuditService(),
    private readonly events = new EventService(),
    private readonly reservations = new StockReservationService(),
  ) {}

  listTypes() { return this.repo.listTypes(); }
  createType(input: ProjectTypeInput, userId: number) { return this.repo.createType(input, userId); }
  listProjects(params: { offset: number; limit: number }) { return this.repo.listProjects(params); }

  async createProject(input: ProjectCreateInput, userId: number, ip?: string | null) {
    const project = await this.repo.createProject(input, userId);
    const projectId = Number((project as unknown as { id: number }).id);
    await this.audit.log({ actorUserId: userId, actionCode: 'project.created', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
    await this.events.create({ module: 'projects', eventType: 'project.created', title: 'Project created', entityType: 'projects', entityId: projectId, actorUserId: userId });
    return project;
  }

  async getProject(id: number) {
    const project = await this.repo.findProject(id);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');
    return project;
  }

  async addSite(projectId: number, input: ProjectSiteInput, userId: number, ip?: string | null) {
    const site = await this.repo.addSite(projectId, input, userId);
    await this.audit.log({ actorUserId: userId, actionCode: 'project.site.added', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
    return site;
  }

  async changeStatus(projectId: number, input: ProjectStatusChangeInput, userId: number, ip?: string | null) {
    const project = await this.repo.changeStatus(projectId, input, userId);
    await this.audit.log({ actorUserId: userId, actionCode: 'project.status.changed', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
    await this.events.create({ module: 'projects', eventType: 'project.status_changed', title: 'Project status changed', entityType: 'projects', entityId: projectId, actorUserId: userId });
    return project;
  }

  async addMaterial(projectId: number, input: ProjectMaterialInput, userId: number, ip?: string | null) {
    await this.repo.requireProject(projectId);
    await this.repo.requireProduct(input.productId);
    const reservation = await this.reservations.createReservation(
      { productId: input.productId, quantity: input.quantity, sourceType: 'project', sourceId: projectId, notes: input.notes ?? 'Project material reservation' },
      userId,
      ip,
    );
    const material = await this.repo.addMaterial(projectId, input, Number(reservation.id), userId);
    await this.audit.log({ actorUserId: userId, actionCode: 'project.material.reserved', module: 'projects', entityType: 'projects', entityId: projectId, newValues: material, ipAddress: ip });
    return material;
  }

  async addInstalledAsset(projectId: number, input: InstalledAssetInput, userId: number, ip?: string | null) {
    const asset = await this.repo.addInstalledAsset(projectId, input, userId);
    await this.audit.log({ actorUserId: userId, actionCode: 'project.asset.installed', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
    return asset;
  }

  addNote(projectId: number, input: ProjectNoteInput, userId: number) {
    return this.repo.addNote(projectId, input, userId);
  }

  summary(projectId: number) {
    return this.repo.summary(projectId);
  }
}
