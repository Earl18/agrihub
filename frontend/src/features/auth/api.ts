import { apiRequest } from '../../shared/api/client';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  role?: string;
  accountType?: string;
  roles?: string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
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

type AuthResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

type RegisterResponse = {
  message: string;
  email: string;
};

export function loginUser(email: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function registerUser(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  profile?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
  };
}) {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export function verifyRegistrationCode(email: string, code: string) {
  return apiRequest<AuthResponse>('/auth/register/verify', {
    method: 'POST',
    body: { email, code },
  });
}

export function resendRegistrationCode(email: string) {
  return apiRequest<{ message: string }>('/auth/register/resend', {
    method: 'POST',
    body: { email },
  });
}

export function loginWithGoogle(credential: string) {
  return apiRequest<AuthResponse>('/auth/google', {
    method: 'POST',
    body: { credential },
  });
}

export function getGoogleAuthConfig() {
  return apiRequest<{
    enabled: boolean;
    clientId: string;
  }>('/auth/google/config');
}

export function requestPasswordReset(email: string) {
  return apiRequest<{ message: string }>('/auth/forgot-password/request', {
    method: 'POST',
    body: { email },
  });
}

export function verifyPasswordResetCode(email: string, code: string) {
  return apiRequest<{ message: string }>('/auth/forgot-password/verify', {
    method: 'POST',
    body: { email, code },
  });
}

export function resetPassword(email: string, code: string, password: string) {
  return apiRequest<{ message: string }>('/auth/forgot-password/reset', {
    method: 'POST',
    body: { email, code, password },
  });
}
