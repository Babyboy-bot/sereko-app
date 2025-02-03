import nodemailer from 'nodemailer';
import { Notification, EmailConfig, SMSConfig } from '../../types/notification';
import { db } from '../firebase';

export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async createNotification(notification: Notification): Promise<string> {
    const notificationRef = await db.collection('notifications').add({
      ...notification,
      createdAt: new Date()
    });

    return notificationRef.id;
  }

  async sendEmail(config: EmailConfig): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        ...config
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendSMS(config: SMSConfig): Promise<void> {
    // Implement SMS sending logic here
    // You can integrate with services like Twilio, Africa's Talking, etc.
    console.log('SMS would be sent:', config);
  }

  async sendBookingNotification(bookingId: string, type: 'created' | 'updated' | 'cancelled'): Promise<void> {
    const bookingRef = await db.collection('bookings').doc(bookingId).get();
    if (!bookingRef.exists) {
      throw new Error('Booking not found');
    }

    const booking = bookingRef.data();
    if (!booking) {
      throw new Error('Booking data is empty');
    }

    // Create notifications for both client and provider
    const notifications: Notification[] = [
      {
        userId: booking.clientId,
        type: 'booking',
        title: `Réservation ${type === 'created' ? 'créée' : type === 'updated' ? 'mise à jour' : 'annulée'}`,
        message: `Votre réservation a été ${type === 'created' ? 'créée' : type === 'updated' ? 'mise à jour' : 'annulée'}`,
        bookingId,
        read: false,
        createdAt: new Date()
      },
      {
        userId: booking.providerId,
        type: 'booking',
        title: `Réservation ${type === 'created' ? 'créée' : type === 'updated' ? 'mise à jour' : 'annulée'}`,
        message: `Une réservation a été ${type === 'created' ? 'créée' : type === 'updated' ? 'mise à jour' : 'annulée'}`,
        bookingId,
        read: false,
        createdAt: new Date()
      }
    ];

    await Promise.all(notifications.map(notification => this.createNotification(notification)));
  }
}
