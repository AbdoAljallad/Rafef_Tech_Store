export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  useMockAuth: import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true',
} as const;
