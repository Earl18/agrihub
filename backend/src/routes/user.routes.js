import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import {
  applyForRole,
  getCurrentUser,
  getDashboardData,
  getLaborData,
  getMarketplaceData,
  getServicesData,
  updateCurrentUser,
} from '../controllers/user.controller.js';

const router = Router();

router.get('/me', requireAuth, getCurrentUser);
router.put('/me', requireAuth, updateCurrentUser);
router.post('/roles/apply', requireAuth, applyForRole);
router.get('/dashboard', requireAuth, getDashboardData);
router.get('/marketplace', optionalAuth, getMarketplaceData);
router.get('/labor', optionalAuth, getLaborData);
router.get('/services', getServicesData);

export { router };
