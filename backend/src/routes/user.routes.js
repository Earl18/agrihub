import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import {
  applyForRole,
  createLaborBooking,
  createProfileAvatarUploadUrl,
  createVerificationUploadUrl,
  getCurrentUser,
  getDashboardData,
  getLaborData,
  getMarketplaceData,
  getServicesData,
  requestEmailChange,
  updateCurrentUser,
  verifyEmailChange,
} from '../controllers/user.controller.js';

const router = Router();

router.get('/me', requireAuth, getCurrentUser);
router.put('/me', requireAuth, updateCurrentUser);
router.post('/me/email-change/request', requireAuth, requestEmailChange);
router.post('/me/email-change/verify', requireAuth, verifyEmailChange);
router.post('/profile/avatar/upload-url', requireAuth, createProfileAvatarUploadUrl);
router.post('/verification/upload-url', requireAuth, createVerificationUploadUrl);
router.post('/roles/apply', requireAuth, applyForRole);
router.post('/labor/book', requireAuth, createLaborBooking);
router.get('/dashboard', requireAuth, getDashboardData);
router.get('/marketplace', optionalAuth, getMarketplaceData);
router.get('/labor', optionalAuth, getLaborData);
router.get('/services', getServicesData);

export { router };
