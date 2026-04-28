import { apiRequest } from '../../shared/api/client';

export function getCurrentUserProfile() {
  return apiRequest<any>('/data/me');
}

export function updateCurrentUserProfile(payload: any) {
  return apiRequest<any>('/data/me', {
    method: 'PUT',
    body: payload,
  });
}

export function requestCurrentUserEmailChange(email: string) {
  return apiRequest<{ message: string; pendingEmail: string; requestedAt: string }>(
    '/data/me/email-change/request',
    {
      method: 'POST',
      body: { email },
    },
  );
}

export function verifyCurrentUserEmailChange(email: string, code: string) {
  return apiRequest<{ message: string; user: any }>('/data/me/email-change/verify', {
    method: 'POST',
    body: { email, code },
  });
}

export function getDashboardData() {
  return apiRequest<any>('/data/dashboard');
}

export function getMarketplaceData() {
  return apiRequest<any>('/data/marketplace');
}

export function getLaborData() {
  return apiRequest<any>('/data/labor');
}

export function createLaborBooking(payload: {
  workerId: string;
  date: string;
  time: string;
  duration: string;
  location: string;
}) {
  return apiRequest<{ message: string; booking: any }>('/data/labor/book', {
    method: 'POST',
    body: payload,
  });
}

export function getServicesData() {
  return apiRequest<any>('/data/services');
}

export function applyForRole(payload: any) {
  return apiRequest<any>('/data/roles/apply', {
    method: 'POST',
    body: payload,
  });
}

export function createVerificationUploadUrl(payload: {
  role: 'seller' | 'laborer';
  documentType: string;
  fileName: string;
}) {
  return apiRequest<{
    bucket: string;
    path: string;
    token: string;
    signedUrl: string;
  }>('/data/verification/upload-url', {
    method: 'POST',
    body: payload,
  });
}

export function createProfileAvatarUploadUrl(payload: { fileName: string }) {
  return apiRequest<{
    bucket: string;
    path: string;
    token: string;
    signedUrl: string;
  }>('/data/profile/avatar/upload-url', {
    method: 'POST',
    body: payload,
  });
}

export function getAdminOverview() {
  return apiRequest<any>('/admin/overview');
}

export function updateAdminUserAccess(userId: string, admin: boolean) {
  return apiRequest<any>(`/admin/users/${userId}/access`, {
    method: 'PATCH',
    body: { admin },
  });
}

export function updateAdminUserPenalty(
  userId: string,
  payload: {
    status: 'good' | 'warned' | 'restricted' | 'suspended';
    reason?: string;
    notes?: string;
    expiresAt?: string | null;
  },
) {
  return apiRequest<any>(`/admin/users/${userId}/penalty`, {
    method: 'PATCH',
    body: payload,
  });
}

export function updateAdminVerificationStatus(
  userId: string,
  role: 'seller' | 'laborer',
  status: 'verified' | 'pending' | 'unverified',
  reason?: string,
) {
  return apiRequest<any>(`/admin/verifications/${userId}`, {
    method: 'PATCH',
    body: { role, status, reason },
  });
}

export function deleteAdminMarketplaceListing(userId: string, listingIndex: number) {
  return apiRequest<any>(`/admin/marketplace/${userId}/${listingIndex}`, {
    method: 'DELETE',
  });
}

export function updateAdminLaborBooking(
  userId: string,
  bookingType: 'active' | 'history',
  bookingIndex: number,
  status: string,
) {
  return apiRequest<any>(`/admin/labor/${userId}/${bookingType}/${bookingIndex}`, {
    method: 'PATCH',
    body: { status },
  });
}

export function updateAdminServiceBooking(
  userId: string,
  bookingIndex: number,
  status: string,
) {
  return apiRequest<any>(`/admin/services/${userId}/${bookingIndex}`, {
    method: 'PATCH',
    body: { status },
  });
}
