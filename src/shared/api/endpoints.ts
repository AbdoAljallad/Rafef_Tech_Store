export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    profile: '/api/auth/me/profile',
  },
  events: {
    ticker: '/api/events/ticker',
    markRead: (id: number | string) => `/api/events/${id}/read`,
  },
} as const;
