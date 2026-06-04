import { CreativeRepository } from './creative.repository.js';
import { nanoid } from 'nanoid';

export class CreativeService {
  private repo = new CreativeRepository();

  async createJobType(payload: { code: string; defaultName: string; createdBy?: number }) {
    return this.repo.createJobType({ code: payload.code, defaultName: payload.defaultName, createdBy: payload.createdBy ?? null });
  }

  async listJobTypes() {
    return this.repo.listJobTypes();
  }

  async createVendor(payload: { code: string; name: string; contact?: any; createdBy?: number }) {
    return this.repo.createVendor({ code: payload.code, name: payload.name, contact: payload.contact ?? null, createdBy: payload.createdBy ?? null });
  }

  async listVendors() {
    return this.repo.listVendors();
  }

  async createJob(payload: { jobTypeId?: number | null; title: string; description?: string | null; deadlineAt?: string | null; createdBy?: number }) {
    const code = `CRJ-${Date.now()}-${nanoid(5)}`;
    return this.repo.createJob({ jobCode: code, jobTypeId: payload.jobTypeId ?? null, title: payload.title, description: payload.description ?? null, deadlineAt: payload.deadlineAt ?? null, createdBy: payload.createdBy ?? null });
  }

  async listJobs() {
    return this.repo.listJobs();
  }

  async getJob(id: number) {
    return this.repo.getJob(id);
  }

  async addJobLine(payload: { jobId: number; lineType?: string | null; description?: string | null; quantity?: number; unitPrice?: number | null; createdBy?: number }) {
    return this.repo.addJobLine(payload);
  }

  async createVendorTask(payload: { vendorId: number; jobId: number; externalTaskCode?: string | null; notes?: string | null; createdBy?: number }) {
    return this.repo.createVendorTask(payload);
  }

  async changeJobStatus(jobId: number, fromStatus: string | null, toStatus: string, notes?: string | null, changedBy?: number) {
    return this.repo.changeJobStatus(jobId, fromStatus, toStatus, notes ?? null, changedBy ?? null);
  }
}
