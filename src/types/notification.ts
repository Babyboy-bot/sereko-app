export interface Notification {
  id?: string;
  userId: string;
  type: 'booking' | 'payment' | 'reminder';
  title: string;
  message: string;
  bookingId?: string;
  read: boolean;
  createdAt: Date;
}

export interface EmailConfig {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SMSConfig {
  to: string;
  message: string;
}
