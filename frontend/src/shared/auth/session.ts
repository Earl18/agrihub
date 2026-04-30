export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  accountStatus?: 'active' | 'disabled';
  disabledAt?: string | null;
  disabledReason?: string;
  role?: string;
  accountType?: string;
  roles?: string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  phone?: string;
  profile?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    age?: string;
    gender?: string;
    dateOfBirth?: string;
    civilStatus?: string;
    nationality?: string;
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
    avatarUrl?: string;
    coordinates?: {
      lat?: number | null;
      lng?: number | null;
    };
  };
  verification?: {
    seller?: 'unverified' | 'pending' | 'verified';
    laborer?: 'unverified' | 'pending' | 'verified';
  };
  verificationMeta?: {
    seller?: {
      reviewReason?: string;
      rejectedAt?: string | null;
    };
    laborer?: {
      reviewReason?: string;
      rejectedAt?: string | null;
    };
  };
  emailChangePending?: {
    email?: string;
    requestedAt?: string | null;
  } | null;
  phoneVerification?: {
    status?: 'unverified' | 'verified';
    source?: string;
    verifiedAt?: string | null;
    requestedAt?: string | null;
  };
  phoneChangePending?: {
    phone?: string;
    requestedAt?: string | null;
  } | null;
  penalty?: {
    status?: 'good' | 'warned' | 'restricted' | 'suspended';
    reason?: string;
    notes?: string;
    penalizedAt?: string | null;
    expiresAt?: string | null;
    penalizedBy?: string;
  };
  canManageCommercialFeatures?: boolean;
};

const TOKEN_KEY = 'agrihub_token';
const USER_KEY = 'agrihub_user';
const SESSION_UPDATED_EVENT = 'agrihub:session-updated';
const SUPER_ADMIN_EMAILS = new Set(['admin@agrihub.com', 'earljustinesierra@gmail.com']);

function normalizeSessionUser(user: SessionUser): SessionUser {
  const normalizedEmail = String(user?.email || '').trim().toLowerCase();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.has(normalizedEmail);
  const isAdmin = Boolean(user?.isAdmin || user?.roles?.includes('admin') || isSuperAdmin);

  return {
    ...user,
    isAdmin,
    isSuperAdmin,
  };
}

function notifySessionUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

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
    return normalizeSessionUser(JSON.parse(rawUser) as SessionUser);
  } catch {
    return null;
  }
}

export function persistSession(token: string, user: SessionUser) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(normalizeSessionUser(user)));
  notifySessionUpdated();
}

export function persistSessionUser(user: SessionUser) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(normalizeSessionUser(user)));
  notifySessionUpdated();
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
  notifySessionUpdated();
}

export function getSessionUpdatedEventName() {
  return SESSION_UPDATED_EVENT;
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

export function isAdminUser(user?: SessionUser | null) {
  return Boolean(
    user?.isAdmin ||
      user?.isSuperAdmin ||
      user?.roles?.includes('admin') ||
      SUPER_ADMIN_EMAILS.has(String(user?.email || '').trim().toLowerCase()),
  );
}

export function isSuperAdminUser(user?: SessionUser | null) {
  return Boolean(
    user?.isSuperAdmin ||
      SUPER_ADMIN_EMAILS.has(String(user?.email || '').trim().toLowerCase()),
  );
}

export function getAuthenticatedHomeRoute(user?: SessionUser | null) {
  return isAdminUser(user) ? '/admin' : '/app';
}

export function getLogoHomeRoute(user?: SessionUser | null) {
  if (!user) {
    return '/';
  }

  return '/app';
}
