export interface PaymentProvider {
  name: string;
  initialize(request: PaymentRequest): Promise<PaymentResponse>;
  validateWebhook(signature: string, payload: any): boolean;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  phoneNumber: string;
  provider: string;
  bookingId: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
  error?: any;
}

export interface PaymentCallback {
  transactionId: string;
  status: 'success' | 'failed';
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}
