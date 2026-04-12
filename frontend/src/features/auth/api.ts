import { apiRequest } from '../../shared/api/client';

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthResponse = {
  message: string;
  token: string;
  user: AuthUser;
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
}) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
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
