import { Request, Response } from 'express';
import { NotificationService } from '../services/notification/NotificationService';
import { db } from '../services/firebase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async sendNotification(req: Request, res: Response) {
    try {
      const { userId, type, title, message, bookingId } = req.body;

      const notificationId = await this.notificationService.createNotification({
        userId,
        type,
        title,
        message,
        bookingId,
        read: false,
        createdAt: new Date()
      });

      res.json({ id: notificationId });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  }

  async sendReminders(req: Request, res: Response) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const bookingsSnapshot = await db.collection('bookings')
        .where('date', '>=', tomorrow)
        .where('date', '<=', endOfTomorrow)
        .where('status', '==', 'confirmed')
        .get();

      const reminderPromises = bookingsSnapshot.docs.map(async (doc) => {
        const booking = doc.data();
        
        // Check if reminder already sent
        const reminderDoc = await db.collection('notifications')
          .where('bookingId', '==', doc.id)
          .where('type', '==', 'reminder')
          .get();

        if (reminderDoc.empty) {
          // Create reminder notifications
          const notifications = [
            {
              userId: booking.clientId,
              type: 'reminder',
              title: 'Rappel de réservation',
              message: `Rappel : vous avez une réservation demain à ${
                format(booking.date.toDate(), 'HH:mm', { locale: fr })
              }`,
              bookingId: doc.id,
              read: false,
              createdAt: new Date()
            },
            {
              userId: booking.providerId,
              type: 'reminder',
              title: 'Rappel de réservation',
              message: `Rappel : vous avez une réservation demain à ${
                format(booking.date.toDate(), 'HH:mm', { locale: fr })
              }`,
              bookingId: doc.id,
              read: false,
              createdAt: new Date()
            }
          ];

          return Promise.all(
            notifications.map(notification =>
              this.notificationService.createNotification(notification)
            )
          );
        }
      });

      await Promise.all(reminderPromises);

      res.json({ status: 'Reminders sent successfully' });
    } catch (error) {
      console.error('Error sending reminders:', error);
      res.status(500).json({ error: 'Failed to send reminders' });
    }
  }
}
