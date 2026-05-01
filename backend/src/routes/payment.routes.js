import { Router } from 'express';
import { handleXenditWebhook } from '../controllers/payment.controller.js';

const router = Router();

router.post('/xendit/webhook', handleXenditWebhook);

export { router };
