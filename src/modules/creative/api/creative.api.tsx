import { httpClient } from '../../../shared/api/httpClient';

export type CreativeJobListItem = {
  id: number;
  job_code: string;
  title: string;
  status: string;
  deadline: string | null;
  created_at: string;
};

export const creativeApi = {
  listJobTypes() {
    return httpClient.get<{ items: any[] }>('/api/creative/job-types');
  },
  createJobType(payload: any) {
    return httpClient.post<{ jobType: any }>('/api/creative/job-types', payload);
  },
  listVendors() {
    return httpClient.get<{ items: any[] }>('/api/creative/vendors');
  },
  createVendor(payload: any) {
    return httpClient.post<{ vendor: any }>('/api/creative/vendors', payload);
  },
  listJobs() {
    return httpClient.get<{ items: CreativeJobListItem[] }>('/api/creative/jobs');
  },
  createJob(payload: any) {
    return httpClient.post<{ job: any }>('/api/creative/jobs', payload);
  },
  getJob(id: number) {
    return httpClient.get<{ job: any }>(`/api/creative/jobs/${id}`);
  },
  addJobLine(jobId: number, payload: any) {
    return httpClient.post<{ job: any }>(`/api/creative/jobs/${jobId}/lines`, payload);
  },
  createVendorTask(jobId: number, payload: any) {
    return httpClient.post<{ task: any }>(`/api/creative/jobs/${jobId}/vendor-tasks`, payload);
  },
  changeJobStatus(jobId: number, payload: any) {
    return httpClient.post<{ job: any }>(`/api/creative/jobs/${jobId}/status`, payload);
  },
};

export default creativeApi;
