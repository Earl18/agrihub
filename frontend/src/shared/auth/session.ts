export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

const TOKEN_KEY = 'agrihub_token';
const USER_KEY = 'agrihub_user';

export function getSessionToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as SessionUser;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getSessionToken() && getSessionUser());
}

export function getUserInitials(name?: string | null) {
  if (!name) {
    return 'GU';
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'GU';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}
