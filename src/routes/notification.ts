import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

const router = Router();
const notificationController = new NotificationController();

router.post('/send', (req, res) => notificationController.sendNotification(req, res));
router.get('/reminders', (req, res) => notificationController.sendReminders(req, res));

export const notificationRoutes = router;
