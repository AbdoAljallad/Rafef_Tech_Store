import { ApiError } from './apiErrors';
import { getAccessToken } from './authToken';
import { env } from '../config/env';
import type { ApiErrorPayload, ApiRequestOptions } from './types';

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const hasJson = contentType.includes('application/json');
  const rawPayload = hasJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (rawPayload && typeof rawPayload === 'object') {
      throw new ApiError(response.status, rawPayload as ApiErrorPayload);
    }

    const textPayload = typeof rawPayload === 'string' ? rawPayload.trim() : '';
    const sanitizedMessage = textPayload && !textPayload.startsWith('<')
      ? textPayload
      : `Request failed with status ${response.status}`;

    throw new ApiError(response.status, {
      code: `HTTP_${response.status}`,
      message: sanitizedMessage,
    });
  }

  if (hasJson) {
    return rawPayload as T;
  }

  return null as T;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = getAccessToken();

  let response: Response;

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Network request failed',
    });
  }

  return parseResponse<T>(response);
}

export const httpClient = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
