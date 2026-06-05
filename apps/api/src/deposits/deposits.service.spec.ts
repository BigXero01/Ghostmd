import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DepositsService } from './deposits.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Stripe mock ────────────────────────────────────────────────────────────────
const mockStripePaymentIntent = {
  id: 'pi_test_123',
  client_secret: 'pi_test_123_secret',
  status: 'succeeded',
};

const mockStripeInstance = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue(mockStripePaymentIntent),
    retrieve: jest.fn().mockResolvedValue(mockStripePaymentIntent),
  },
};

jest.mock('stripe', () => jest.fn(() => mockStripeInstance));

// ── Prisma mock ────────────────────────────────────────────────────────────────
const mockDeposit = {
  id: 'deposit-1',
  userId: 'user-1',
  stripePaymentIntentId: 'pi_test_123',
  amountUsd: { toString: () => '100.00' },
  status: 'PENDING',
};

const txMock = {
  deposit: {
    updateMany: jest.fn(),
  },
  portfolio: {
    update: jest.fn(),
  },
};

const prisma = {
  deposit: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const configService = {
  get: jest.fn().mockReturnValue('sk_test_fake'),
};

describe('DepositsService', () => {
  let service: DepositsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<DepositsService>(DepositsService);
    jest.clearAllMocks();
  });

  // ── createIntent ───────────────────────────────────────────────────────────
  describe('createIntent', () => {
    it('throws BadRequestException when amount is below minimum', async () => {
      await expect(service.createIntent('user-1', 10)).rejects.toThrow(BadRequestException);
      expect(mockStripeInstance.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('creates a PaymentIntent and deposit record on success', async () => {
      prisma.deposit.create.mockResolvedValue(mockDeposit);

      const result = await service.createIntent('user-1', 100);

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10000, currency: 'usd' }),
      );
      expect(prisma.deposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', amountUsd: 100, status: 'PENDING' }),
        }),
      );
      expect(result).toMatchObject({ clientSecret: 'pi_test_123_secret', depositId: 'deposit-1' });
    });

    it('converts amount to cents correctly (avoids floating point errors)', async () => {
      prisma.deposit.create.mockResolvedValue(mockDeposit);

      await service.createIntent('user-1', 99.99);

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 9999 }),
      );
    });
  });

  // ── confirmDeposit ────────────────────────────────────────────────────────
  describe('confirmDeposit', () => {
    it('throws NotFoundException when deposit does not belong to user', async () => {
      prisma.deposit.findUnique.mockResolvedValue({ ...mockDeposit, userId: 'other-user' });

      await expect(service.confirmDeposit('user-1', 'pi_test_123')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when Stripe intent is not succeeded', async () => {
      prisma.deposit.findUnique.mockResolvedValue(mockDeposit);
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValueOnce({
        ...mockStripePaymentIntent,
        status: 'processing',
      });

      await expect(service.confirmDeposit('user-1', 'pi_test_123')).rejects.toThrow(BadRequestException);
    });

    it('processes confirmed deposit when Stripe reports succeeded', async () => {
      prisma.deposit.findUnique.mockResolvedValue(mockDeposit);
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue(mockStripePaymentIntent);
      txMock.deposit.updateMany.mockResolvedValue({ count: 1 });
      txMock.portfolio.update.mockResolvedValue({});
      prisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

      const result = await service.confirmDeposit('user-1', 'pi_test_123');

      expect(txMock.deposit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'deposit-1', status: { not: 'CONFIRMED' } }) }),
      );
      expect(txMock.portfolio.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ balance: { increment: 100 } }) }),
      );
      expect(result).toEqual({ success: true });
    });
  });

  // ── processWebhookDeposit (CAS idempotency) ─────────────────────────────────
  describe('processWebhookDeposit', () => {
    it('skips processing when deposit is already CONFIRMED', async () => {
      prisma.deposit.findUnique.mockResolvedValue({ ...mockDeposit, status: 'CONFIRMED' });

      await service.processWebhookDeposit('pi_test_123');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('credits portfolio on first successful webhook call', async () => {
      prisma.deposit.findUnique.mockResolvedValue(mockDeposit);
      txMock.deposit.updateMany.mockResolvedValue({ count: 1 });
      txMock.portfolio.update.mockResolvedValue({});
      prisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

      await service.processWebhookDeposit('pi_test_123');

      expect(txMock.portfolio.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ balance: { increment: 100 } }) }),
      );
    });

    it('does not double-credit on concurrent webhook delivery (count=0 guard)', async () => {
      prisma.deposit.findUnique.mockResolvedValue(mockDeposit);
      // Simulate another call already flipped the status to CONFIRMED
      txMock.deposit.updateMany.mockResolvedValue({ count: 0 });
      prisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

      await service.processWebhookDeposit('pi_test_123');

      expect(txMock.deposit.updateMany).toHaveBeenCalled();
      expect(txMock.portfolio.update).not.toHaveBeenCalled();
    });
  });

  // ── getDeposits ───────────────────────────────────────────────────────────
  describe('getDeposits', () => {
    it('returns all deposits for a user ordered by date', async () => {
      prisma.deposit.findMany.mockResolvedValue([mockDeposit]);

      const result = await service.getDeposits('user-1');

      expect(prisma.deposit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' } }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
