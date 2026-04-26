import { Router } from 'express';
import { router as authRouter } from './auth.routes.js';
import { router as healthRouter } from './health.routes.js';
import { router as userRouter } from './user.routes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/health', healthRouter);
router.use('/data', userRouter);

export { router };
