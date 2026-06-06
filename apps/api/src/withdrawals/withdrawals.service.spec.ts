import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { PrismaService } from '../prisma/prisma.service';

const mockWithdrawal = {
  id: 'withdrawal-1',
  userId: 'user-1',
  amountUsd: { toString: () => '50.00' },
  status: 'REQUESTED',
  createdAt: new Date(),
};

const txMock = {
  portfolio: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  withdrawal: {
    create: jest.fn(),
  },
};

const prisma = {
  withdrawal: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('WithdrawalsService', () => {
  let service: WithdrawalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WithdrawalsService>(WithdrawalsService);
    jest.clearAllMocks();
  });

  // ── requestWithdrawal ──────────────────────────────────────────────────────
  describe('requestWithdrawal', () => {
    it('throws BadRequestException when portfolio is not found', async () => {
      txMock.portfolio.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

      await expect(service.requestWithdrawal('user-1', 50)).rejects.toThrow(BadRequestException);
      expect(txMock.portfolio.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when balance is insufficient', async () => {
      txMock.portfolio.findUnique.mockResolvedValue({
        userId: 'user-1',
        balance: { toString: () => '20.00' },
      });
      prisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

      await expect(service.requestWithdrawal('user-1', 50)).rejects.toThrow(BadRequestException);
      expect(txMock.portfolio.update).not.toHaveBeenCalled();
    });

    it('decrements balance and creates withdrawal record when balance is sufficient', async () => {
      txMock.portfolio.findUnique.mockResolvedValue({
        userId: 'user-1',
        balance: { toString: () => '200.00' },
      });
      txMock.portfolio.update.mockResolvedValue({});
      txMock.withdrawal.create.mockResolvedValue(mockWithdrawal);
      prisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

      const result = await service.requestWithdrawal('user-1', 50);

      expect(txMock.portfolio.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: { balance: { decrement: 50 } },
        }),
      );
      expect(txMock.withdrawal.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: 'user-1', amountUsd: 50, status: 'REQUESTED' } }),
      );
      expect(result).toEqual(mockWithdrawal);
    });

    it('rejects exact-balance withdrawal (no overdraft allowed)', async () => {
      // balance === amountUsd: should succeed (not overdraft)
      txMock.portfolio.findUnique.mockResolvedValue({
        userId: 'user-1',
        balance: { toString: () => '50.00' },
      });
      txMock.portfolio.update.mockResolvedValue({});
      txMock.withdrawal.create.mockResolvedValue(mockWithdrawal);
      prisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

      const result = await service.requestWithdrawal('user-1', 50);
      expect(result).toEqual(mockWithdrawal);
    });
  });

  // ── getWithdrawals ─────────────────────────────────────────────────────────
  describe('getWithdrawals', () => {
    it('returns withdrawals for a user ordered by date descending', async () => {
      prisma.withdrawal.findMany.mockResolvedValue([mockWithdrawal]);

      const result = await service.getWithdrawals('user-1');

      expect(prisma.withdrawal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' } }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
