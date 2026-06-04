export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

export type ApiRequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
};
