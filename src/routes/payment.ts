import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';

const router = Router();
const paymentController = new PaymentController();

router.post('/process', (req, res) => paymentController.processPayment(req, res));
router.post('/webhook/orange', (req, res) => paymentController.handleOrangeWebhook(req, res));
router.post('/webhook/mtn', (req, res) => paymentController.handleMTNWebhook(req, res));

export const paymentRoutes = router;
