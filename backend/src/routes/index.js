import { Router } from 'express';
import { router as authRouter } from './auth.routes.js';
import { router as healthRouter } from './health.routes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/health', healthRouter);

export { router };
