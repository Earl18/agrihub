import { apiRequest } from '../../shared/api/client';

export function getCurrentUserProfile() {
  return apiRequest<any>('/data/me');
}

export function getWalletSummary() {
  return apiRequest<{ wallet: any }>('/data/wallet');
}

export function requestWalletCashOut(payload: {
  amount: number;
  method: 'gcash' | 'paymaya' | 'card';
  accountName?: string;
  mobileNumber?: string;
  cardholderName?: string;
  cardBrand?: string;
  cardLast4?: string;
}) {
  return apiRequest<{ message: string; wallet: any; user: any }>('/data/wallet/cashout', {
    method: 'POST',
    body: payload,
  });
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

export function requestCurrentUserPhoneChange(phone: string) {
  return apiRequest<{ message: string; pendingPhone: string; requestedAt: string }>(
    '/data/me/phone-change/request',
    {
      method: 'POST',
      body: { phone },
    },
  );
}

export function verifyCurrentUserPhoneChange(phone: string, code: string) {
  return apiRequest<{ message: string; user: any }>('/data/me/phone-change/verify', {
    method: 'POST',
    body: { phone, code },
  });
}

export function cancelCurrentUserPhoneChange() {
  return apiRequest<{ message: string; user: any }>('/data/me/phone-change/cancel', {
    method: 'POST',
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
  workerType: string;
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

export function createLaborPaymentCheckout(payload: {
  workerId: string;
  workerType: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  paymentMethod: 'gcash' | 'maya' | 'card';
}) {
  return apiRequest<{
    message: string;
    payment: any;
    checkoutUrl: string;
  }>('/data/labor/payment/checkout', {
    method: 'POST',
    body: payload,
  });
}

export function getLaborPaymentStatus(reference: string) {
  return apiRequest<{
    payment: any;
  }>(`/data/labor/payment/${reference}`);
}

export function markLaborBookingOnTheWay(
  bookingId: string,
  payload: {
    lat: number;
    lng: number;
  },
) {
  return apiRequest<{ message: string; booking: any }>(`/data/labor/book/${bookingId}/on-the-way`, {
    method: 'PATCH',
    body: payload,
  });
}

export function markLaborBookingCompleted(bookingId: string) {
  return apiRequest<{ message: string; booking: any; completed: boolean }>(`/data/labor/book/${bookingId}/complete`, {
    method: 'PATCH',
  });
}

export function cancelLaborBooking(bookingId: string) {
  return apiRequest<{ message: string; booking: any }>(`/data/labor/book/${bookingId}/cancel`, {
    method: 'PATCH',
  });
}

export function upsertLaborOffer(payload: {
  title: string;
  workerType: string;
  description: string;
  rate: number;
  availability: string;
  skills: string[];
  location: string;
  experience: string;
  phone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
}) {
  return apiRequest<{ message: string; laborOffer: any }>('/data/labor/offer', {
    method: 'PUT',
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

export function disableAdminUser(userId: string, reason?: string) {
  return apiRequest<any>(`/admin/users/${userId}/disable`, {
    method: 'PATCH',
    body: { reason },
  });
}

export function restoreAdminUser(userId: string) {
  return apiRequest<any>(`/admin/users/${userId}/restore`, {
    method: 'PATCH',
  });
}

export function permanentlyDeleteAdminUser(userId: string) {
  return apiRequest<any>(`/admin/users/${userId}`, {
    method: 'DELETE',
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
