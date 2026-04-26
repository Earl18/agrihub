export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  accountType?: string;
  roles?: string[];
  phone?: string;
  profile?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    address?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    farmName?: string;
    location?: string;
    farmSize?: string;
    experience?: string;
    specialization?: string;
    coordinates?: {
      lat?: number | null;
      lng?: number | null;
    };
  };
  verification?: {
    seller?: 'unverified' | 'pending' | 'verified';
    laborer?: 'unverified' | 'pending' | 'verified';
  };
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

export function persistSession(token: string, user: SessionUser) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function persistSessionUser(user: SessionUser) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated() {
  return Boolean(getSessionToken() && getSessionUser());
}

export function clearSession() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
