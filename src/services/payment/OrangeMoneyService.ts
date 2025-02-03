import axios from 'axios';
import crypto from 'crypto';
import { PaymentProvider, PaymentRequest, PaymentResponse } from '../../types/payment';

export class OrangeMoneyService implements PaymentProvider {
  private apiKey: string;
  private merchantId: string;
  private apiUrl: string;
  private clientId: string;
  private clientSecret: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.ORANGE_API_KEY || '';
    this.merchantId = process.env.ORANGE_MERCHANT_ID || '';
    this.apiUrl = process.env.ORANGE_API_URL || '';
    this.clientId = process.env.ORANGE_CLIENT_ID || '';
    this.clientSecret = process.env.ORANGE_CLIENT_SECRET || '';
    this.webhookSecret = process.env.ORANGE_WEBHOOK_SECRET || '';
  }

  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await axios.post(
        `${this.apiUrl}/oauth/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Error getting Orange Money access token:', error);
      throw new Error('Failed to get access token');
    }
  }

  async initialize(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      const payload = {
        merchant_key: this.merchantId,
        currency: request.currency,
        order_id: request.bookingId,
        amount: request.amount,
        return_url: `${process.env.APP_URL}/payment/callback`,
        cancel_url: `${process.env.APP_URL}/payment/cancel`,
        notif_url: `${process.env.API_URL}/api/payments/webhook/orange`,
        reference: request.bookingId,
        customer: {
          phone: request.phoneNumber
        },
        metadata: request.metadata
      };

      const response = await axios.post(
        `${this.apiUrl}/payment/init`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        transactionId: response.data.pay_token,
        status: 'pending',
        message: 'Payment initialized'
      };
    } catch (error) {
      console.error('Error initializing Orange Money payment:', error);
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
