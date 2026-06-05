export enum WithdrawalStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
}

export interface Withdrawal {
  id: string;
  userId: string;
  amountUsd: string;
  status: WithdrawalStatus;
  processedAt: string | null;
  createdAt: string;
}

export interface CreateWithdrawalDto {
  amountUsd: number;
}
