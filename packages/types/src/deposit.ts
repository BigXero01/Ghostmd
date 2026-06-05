export enum DepositStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface Deposit {
  id: string;
  userId: string;
  stripePaymentIntentId: string;
  amountUsd: string;
  status: DepositStatus;
  confirmedAt: string | null;
  createdAt: string;
}

export interface CreateDepositIntentDto {
  amountUsd: number;
}

export interface DepositIntentResponse {
  clientSecret: string;
  depositId: string;
}
