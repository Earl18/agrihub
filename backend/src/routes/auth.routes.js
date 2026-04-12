import { Router } from 'express';
import {
  getGoogleConfig,
  googleLogin,
  login,
  register,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/google/config', getGoogleConfig);

export { router };
