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

export function getDashboardData() {
  return apiRequest<any>('/data/dashboard');
}

export function getMarketplaceData() {
  return apiRequest<any>('/data/marketplace');
}

export function getLaborData() {
  return apiRequest<any>('/data/labor');
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
