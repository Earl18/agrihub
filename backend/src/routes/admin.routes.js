import { Router } from 'express';
import {
  deleteMarketplaceListing,
  getAdminOverview,
  permanentlyDeleteUser,
  restoreUser,
  softDeleteUser,
  updateLaborBookingStatus,
  updateUserPenalty,
  updateServiceBookingStatus,
  updateUserAdminAccess,
  updateVerificationStatus,
} from '../controllers/admin.controller.js';
import { requireAdmin, requireAuth, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/overview', getAdminOverview);
router.patch('/users/:userId/access', requireSuperAdmin, updateUserAdminAccess);
router.patch('/users/:userId/disable', requireSuperAdmin, softDeleteUser);
router.patch('/users/:userId/restore', requireSuperAdmin, restoreUser);
router.delete('/users/:userId', requireSuperAdmin, permanentlyDeleteUser);
router.patch('/users/:userId/penalty', updateUserPenalty);
router.patch('/verifications/:userId', updateVerificationStatus);
router.delete('/marketplace/:userId/:listingIndex', deleteMarketplaceListing);
router.patch('/labor/:userId/:bookingType/:bookingIndex', updateLaborBookingStatus);
router.patch('/services/:userId/:bookingIndex', updateServiceBookingStatus);

export { router };
