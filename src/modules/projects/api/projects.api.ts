import { httpClient } from '../../../shared/api/httpClient';

export type ProjectType = {
  id: number;
  code: string;
  default_name: string;
  description: string | null;
};

export type ProjectListItem = {
  id: number;
  project_code: string;
  project_type_id: number | null;
  project_type_name?: string | null;
  customer_id: number | null;
  customer_name?: string | null;
  title: string;
  status: string;
  created_at: string;
};

export type Project = ProjectListItem & {
  description: string | null;
  sites: any[];
  materials: any[];
  installedAssets: any[];
  notes: any[];
  history: any[];
};

export const projectsApi = {
  listTypes() {
    return httpClient.get<{ items: ProjectType[] }>('/api/projects/types');
  },
  createType(payload: { code: string; defaultName: string; description?: string | null }) {
    return httpClient.post<{ projectType: ProjectType }>('/api/projects/types', payload);
  },
  listProjects(params?: { offset?: number; limit?: number }) {
    const query = params ? `?offset=${params.offset ?? 0}&limit=${params.limit ?? 50}` : '';
    return httpClient.get<{ items: ProjectListItem[] }>(`/api/projects${query}`);
  },
  createProject(payload: {
    projectTypeId?: number | null;
    customerId?: number | null;
    title: string;
    description?: string | null;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    assignedUserId?: number | null;
  }) {
    return httpClient.post<{ project: Project }>('/api/projects', payload);
  },
  getProject(id: number | string) {
    return httpClient.get<{ project: Project }>(`/api/projects/${id}`);
  },
  getProjectBilling(id: number | string) {
    return httpClient.get<{ billing: { project: ProjectListItem; materials: any[] } }>(`/api/projects/${id}/billing`);
  },
  addSite(id: number | string, payload: any) {
    return httpClient.post<{ site: any }>(`/api/projects/${id}/sites`, payload);
  },
  changeStatus(id: number | string, payload: any) {
    return httpClient.post<{ project: Project }>(`/api/projects/${id}/status`, payload);
  },
  addMaterial(id: number | string, payload: any) {
    return httpClient.post<{ material: any }>(`/api/projects/${id}/materials`, payload);
  },
  addInstalledAsset(id: number | string, payload: any) {
    return httpClient.post<{ asset: any }>(`/api/projects/${id}/assets`, payload);
  },
  addNote(id: number | string, payload: any) {
    return httpClient.post<{ note: any }>(`/api/projects/${id}/notes`, payload);
  },
  summary(id: number | string) {
    return httpClient.get<{ summary: { project: Project; customer: any | null; projectType: ProjectType | null } }>(`/api/projects/${id}/summary`);
  },
};
