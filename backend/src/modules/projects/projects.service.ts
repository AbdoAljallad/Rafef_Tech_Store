import { AppError } from '../../shared/errors/AppError.js';
import { EntityTranslationService } from '../../shared/localization/entityTranslation.service.js';
import type { UiLanguage } from '../../shared/localization/language.js';
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
    private readonly translations = new EntityTranslationService(),
  ) {}

  listTypes(language?: UiLanguage) { return this.repo.listTypes(language); }

  async createType(input: ProjectTypeInput, userId: number, language?: UiLanguage) {
    const type = await this.repo.createType(input, userId);
    await this.translations.syncEntityField({
      entityType: 'project_types',
      entityId: Number((type as { id: number }).id),
      fieldName: 'default_name',
      text: input.defaultName,
      requestedLanguage: language,
    });
    return type;
  }

  listProjects(params: { offset: number; limit: number; language?: UiLanguage }) { return this.repo.listProjects(params); }

  async createProject(input: ProjectCreateInput, userId: number, ip?: string | null, language?: UiLanguage) {
    const project = await this.repo.createProject(input, userId, language);
    const projectId = Number((project as unknown as { id: number }).id);
    await this.audit.log({ actorUserId: userId, actionCode: 'project.created', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
    await this.events.create({ module: 'projects', eventType: 'project.created', title: 'Project created', entityType: 'projects', entityId: projectId, actorUserId: userId });
    return project;
  }

  async getProject(id: number, language?: UiLanguage) {
    const project = await this.repo.findProject(id, language);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');
    return project;
  }

  getProjectBilling(id: number, language?: UiLanguage) {
    return this.repo.getProjectBilling(id, language);
  }

  async addSite(projectId: number, input: ProjectSiteInput, userId: number, ip?: string | null) {
    const site = await this.repo.addSite(projectId, input, userId);
    await this.audit.log({ actorUserId: userId, actionCode: 'project.site.added', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
    return site;
  }

  async changeStatus(projectId: number, input: ProjectStatusChangeInput, userId: number, ip?: string | null, language?: UiLanguage) {
    const project = await this.repo.changeStatus(projectId, input, userId, language);
    await this.audit.log({ actorUserId: userId, actionCode: 'project.status.changed', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
    await this.events.create({ module: 'projects', eventType: 'project.status_changed', title: 'Project status changed', entityType: 'projects', entityId: projectId, actorUserId: userId });
    return project;
  }

  async addMaterial(projectId: number, input: ProjectMaterialInput, userId: number, ip?: string | null, language?: UiLanguage) {
    await this.repo.requireProject(projectId);
    await this.repo.requireProduct(input.productId, language);
    const reservation = await this.reservations.createReservation(
      { productId: input.productId, quantity: input.quantity, sourceType: 'project', sourceId: projectId, notes: input.notes ?? 'Project material reservation' },
      userId,
      ip,
    );
    const material = await this.repo.addMaterial(projectId, input, Number(reservation.id), userId, language);
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

  summary(projectId: number, language?: UiLanguage) {
    return this.repo.summary(projectId, language);
  }
}
