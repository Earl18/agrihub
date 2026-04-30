import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import {
  applyForRole,
  cancelPhoneChange,
  cancelLaborBooking,
  createLaborBooking,
  createProfileAvatarUploadUrl,
  createVerificationUploadUrl,
  getCurrentUser,
  getDashboardData,
  getLaborData,
  getMarketplaceData,
  getServicesData,
  markLaborBookingOnTheWay,
  requestEmailChange,
  requestPhoneChange,
  upsertLaborOffer,
  updateCurrentUser,
  verifyEmailChange,
  verifyPhoneChange,
} from '../controllers/user.controller.js';

const router = Router();

router.get('/me', requireAuth, getCurrentUser);
router.put('/me', requireAuth, updateCurrentUser);
router.post('/me/email-change/request', requireAuth, requestEmailChange);
router.post('/me/email-change/verify', requireAuth, verifyEmailChange);
router.post('/me/phone-change/request', requireAuth, requestPhoneChange);
router.post('/me/phone-change/verify', requireAuth, verifyPhoneChange);
router.post('/me/phone-change/cancel', requireAuth, cancelPhoneChange);
router.post('/profile/avatar/upload-url', requireAuth, createProfileAvatarUploadUrl);
router.post('/verification/upload-url', requireAuth, createVerificationUploadUrl);
router.post('/roles/apply', requireAuth, applyForRole);
router.post('/labor/book', requireAuth, createLaborBooking);
router.patch('/labor/book/:bookingId/cancel', requireAuth, cancelLaborBooking);
router.patch('/labor/book/:bookingId/on-the-way', requireAuth, markLaborBookingOnTheWay);
router.put('/labor/offer', requireAuth, upsertLaborOffer);
router.get('/dashboard', requireAuth, getDashboardData);
router.get('/marketplace', optionalAuth, getMarketplaceData);
router.get('/labor', optionalAuth, getLaborData);
router.get('/services', getServicesData);

export { router };
