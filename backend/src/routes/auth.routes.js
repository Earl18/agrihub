import { Router } from 'express';
import {
  getGoogleConfig,
  googleLogin,
  login,
  requestPasswordReset,
  register,
  resendRegistrationCode,
  resetPassword,
  verifyRegistrationCode,
  verifyPasswordResetCode,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/register/verify', verifyRegistrationCode);
router.post('/register/resend', resendRegistrationCode);
router.post('/login', login);
router.post('/forgot-password/request', requestPasswordReset);
router.post('/forgot-password/verify', verifyPasswordResetCode);
router.post('/forgot-password/reset', resetPassword);
router.post('/google', googleLogin);
router.get('/google/config', getGoogleConfig);

export { router };
