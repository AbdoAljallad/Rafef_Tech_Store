import { httpClient } from '../../../shared/api/httpClient';

export type CreativeJobType = {
  id: number;
  code: string;
  default_name: string;
  description?: string | null;
};

export type CreativeVendor = {
  id: number;
  code: string;
  name: string;
  contact?: unknown;
  created_at?: string;
};

export type CreativeJobListItem = {
  id: number;
  job_code: string;
  job_type_id: number | null;
  customer_id: number | null;
  customer_code: string | null;
  customer_name: string | null;
  job_type_name: string | null;
  title: string;
  status: string;
  deadline: string | null;
  created_at: string;
  line_count: number;
  vendor_task_count: number;
};

export type CreativeJobLine = {
  id: number;
  line_type: string | null;
  description: string | null;
  quantity: number;
  unit_price: number | null;
  line_total: number;
  created_at: string;
};

export type CreativeVendorTask = {
  id: number;
  vendor_id: number;
  vendor_name: string | null;
  vendor_code: string | null;
  external_task_code: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type CreativeJobHistory = {
  id: number;
  from_status: string | null;
  to_status: string;
  notes: string | null;
  created_at: string;
};

export type CreativeJobDetail = {
  id: number;
  job_code: string;
  job_type_id: number | null;
  customer_id: number | null;
  customer_code: string | null;
  customer_name: string | null;
  job_type_name: string | null;
  title: string;
  description: string | null;
  status: string;
  deadline_at: string | null;
  created_at: string;
  lines: CreativeJobLine[];
  vendorTasks: CreativeVendorTask[];
  history: CreativeJobHistory[];
};

export type CreativeJobCreated = {
  id: number;
  job_code: string;
};

export const creativeApi = {
  listJobTypes() {
    return httpClient.get<{ items: CreativeJobType[] }>('/api/creative/job-types');
  },
  createJobType(payload: { code: string; defaultName: string }) {
    return httpClient.post<{ jobType: CreativeJobType }>('/api/creative/job-types', payload);
  },
  listVendors() {
    return httpClient.get<{ items: CreativeVendor[] }>('/api/creative/vendors');
  },
  createVendor(payload: { code: string; name: string; contact?: unknown }) {
    return httpClient.post<{ vendor: CreativeVendor }>('/api/creative/vendors', payload);
  },
  listJobs() {
    return httpClient.get<{ items: CreativeJobListItem[] }>('/api/creative/jobs');
  },
  createJob(payload: { jobTypeId?: number | null; customerId?: number | null; title: string; description?: string | null; deadlineAt?: string | null }) {
    return httpClient.post<{ job: CreativeJobCreated }>('/api/creative/jobs', payload);
  },
  getJob(id: number) {
    return httpClient.get<{ job: CreativeJobDetail }>(`/api/creative/jobs/${id}`);
  },
  addJobLine(jobId: number, payload: { description?: string | null; quantity?: number; unitPrice?: number | null; lineType?: string | null }) {
    return httpClient.post<{ job: CreativeJobDetail }>(`/api/creative/jobs/${jobId}/lines`, payload);
  },
  createVendorTask(jobId: number, payload: { vendorId: number; jobId: number; externalTaskCode?: string | null; notes?: string | null }) {
    return httpClient.post<{ task: { id: number } }>(`/api/creative/jobs/${jobId}/vendor-tasks`, payload);
  },
  changeJobStatus(jobId: number, payload: { toStatus: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled'; notes?: string | null }) {
    return httpClient.post<{ job: CreativeJobDetail }>(`/api/creative/jobs/${jobId}/status`, payload);
  },
};

export default creativeApi;
