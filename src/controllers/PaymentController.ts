import { Request, Response } from 'express';
import { OrangeMoneyService } from '../services/payment/OrangeMoneyService';
import { MTNMoneyService } from '../services/payment/MTNMoneyService';
import { PaymentRequest } from '../types/payment';
import { db } from '../services/firebase';
import { NotificationService } from '../services/notification/NotificationService';

export class PaymentController {
  private orangeMoneyService: OrangeMoneyService;
  private mtnMoneyService: MTNMoneyService;
  private notificationService: NotificationService;

  constructor() {
    this.orangeMoneyService = new OrangeMoneyService();
    this.mtnMoneyService = new MTNMoneyService();
    this.notificationService = new NotificationService();
  }

  async processPayment(req: Request, res: Response) {
    try {
      const paymentRequest: PaymentRequest = req.body;

      let paymentService;
      switch (paymentRequest.provider.toLowerCase()) {
        case 'orange':
          paymentService = this.orangeMoneyService;
          break;
        case 'mtn':
          paymentService = this.mtnMoneyService;
          break;
        default:
          return res.status(400).json({ error: 'Invalid payment provider' });
      }

      const response = await paymentService.initialize(paymentRequest);

      if (response.success) {
        // Store payment information
        await db.collection('payments').doc(response.transactionId).set({
          ...paymentRequest,
          status: response.status,
          transactionId: response.transactionId,
          createdAt: new Date()
        });
      }

      res.json(response);
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ error: 'Failed to process payment' });
    }
  }

  async handleOrangeWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-orange-signature'] as string;
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      const isValid = this.orangeMoneyService.validateWebhook(signature, req.body);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      const { status, transaction_id, metadata } = req.body;

      await this.updatePaymentStatus('orange', transaction_id, status, metadata);

      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Error handling Orange Money webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleMTNWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-mtn-signature'] as string;
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      const isValid = this.mtnMoneyService.validateWebhook(signature, req.body);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      const { status, external_id, metadata } = req.body;

      await this.updatePaymentStatus('mtn', external_id, status, metadata);

      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Error handling MTN Money webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async updatePaymentStatus(provider: string, transactionId: string, status: string, metadata: any) {
    const paymentRef = db.collection('payments').doc(transactionId);
    const payment = await paymentRef.get();

    if (!payment.exists) {
      throw new Error('Payment not found');
    }

    await paymentRef.update({
      status: status === 'SUCCESS' ? 'completed' : 'failed',
      updatedAt: new Date()
    });

    if (status === 'SUCCESS') {
      // Update booking status
      const bookingRef = db.collection('bookings').doc(metadata.bookingId);
      await bookingRef.update({
        paymentStatus: 'paid',
        updatedAt: new Date()
      });

      // Send notification
      await this.notificationService.createNotification({
        userId: metadata.userId,
        type: 'payment',
        title: 'Paiement confirmé',
        message: 'Votre paiement a été confirmé avec succès',
        bookingId: metadata.bookingId,
        read: false,
        createdAt: new Date()
      });
    }
  }
}
