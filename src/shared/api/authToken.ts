const TOKEN_STORAGE_KEY = 'rafef_tech_access_token';

let accessToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;

  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return;
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
}
