import axios from 'axios';
import crypto from 'crypto';
import { PaymentProvider, PaymentRequest, PaymentResponse } from '../../types/payment';

export class MTNMoneyService implements PaymentProvider {
  private apiKey: string;
  private apiUser: string;
  private merchantId: string;
  private apiUrl: string;
  private subscriptionKey: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.MTN_API_KEY || '';
    this.apiUser = process.env.MTN_API_USER || '';
    this.merchantId = process.env.MTN_MERCHANT_ID || '';
    this.apiUrl = process.env.MTN_API_URL || '';
    this.subscriptionKey = process.env.MTN_SUBSCRIPTION_KEY || '';
    this.webhookSecret = process.env.MTN_WEBHOOK_SECRET || '';
  }

  async initialize(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const payload = {
        amount: request.amount,
        currency: request.currency,
        externalId: request.bookingId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: request.phoneNumber
        },
        payerMessage: request.description,
        payeeNote: request.description
      };

      const response = await axios.post(
        `${this.apiUrl}/collection/v1_0/requesttopay`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Reference-Id': request.bookingId,
            'X-Target-Environment': process.env.MTN_ENVIRONMENT || 'sandbox',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        transactionId: request.bookingId,
        status: 'pending',
        message: 'Payment request sent'
      };
    } catch (error) {
      console.error('Error initializing MTN Money payment:', error);
      return {
        success: false,
        status: 'failed',
        message: 'Failed to initialize payment',
        error: error
      };
    }
  }

  validateWebhook(signature: string, payload: any): boolean {
    const computedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === computedSignature;
  }
}
