import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPortfolio = {
  id: 'portfolio-1',
  userId: 'user-1',
  balance: { toString: () => '500.00' },
  totalDeposited: { toString: () => '400.00' },
  totalEarnings: { toString: () => '100.00' },
  lastCompounded: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSnapshots = [
  { id: 's1', portfolioId: 'portfolio-1', balance: { toString: () => '400.00' }, snapshotAt: new Date() },
  { id: 's2', portfolioId: 'portfolio-1', balance: { toString: () => '500.00' }, snapshotAt: new Date() },
];

const txMock = {
  portfolio: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  portfolioSnapshot: {
    create: jest.fn(),
  },
};

const prisma = {
  portfolio: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    jest.clearAllMocks();
  });

  // ── getPortfolio ──────────────────────────────────────────────────────────
  describe('getPortfolio', () => {
    it('returns the portfolio for a given user', async () => {
      prisma.portfolio.findUnique.mockResolvedValue(mockPortfolio);

      const result = await service.getPortfolio('user-1');

      expect(prisma.portfolio.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(result).toEqual(mockPortfolio);
    });

    it('throws NotFoundException when portfolio does not exist', async () => {
      prisma.portfolio.findUnique.mockResolvedValue(null);

      await expect(service.getPortfolio('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getHistory ────────────────────────────────────────────────────────────
  describe('getHistory', () => {
    it('returns up to 90 snapshots ordered by snapshotAt', async () => {
      prisma.portfolio.findUnique.mockResolvedValue({
        ...mockPortfolio,
        snapshots: mockSnapshots,
      });

      const result = await service.getHistory('user-1');

      expect(prisma.portfolio.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { snapshots: expect.objectContaining({ take: 90 }) },
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('throws NotFoundException when portfolio does not exist', async () => {
      prisma.portfolio.findUnique.mockResolvedValue(null);

      await expect(service.getHistory('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getProjections ────────────────────────────────────────────────────────
  describe('getProjections', () => {
    it('returns 30 daily projections with compounding balance', async () => {
      prisma.portfolio.findUnique.mockResolvedValue(mockPortfolio);

      const result = await service.getProjections('user-1');

      expect(result).toHaveLength(30);
      // Day 1 balance should be greater than initial (compounding applied)
      expect(result[0].balance).toBeGreaterThan(500);
      // Projections are monotonically increasing
      expect(result[29].balance).toBeGreaterThan(result[0].balance);
      // Each entry has expected shape
      expect(result[0]).toMatchObject({ day: 1, balance: expect.any(Number), earnings: expect.any(Number), date: expect.any(String) });
    });
  });

  // ── applyEpochRoi ─────────────────────────────────────────────────────────
  describe('applyEpochRoi', () => {
    it('applies ROI to balance and creates a snapshot', async () => {
      txMock.portfolio.findUnique.mockResolvedValue(mockPortfolio);
      txMock.portfolio.update.mockResolvedValue({});
      txMock.portfolioSnapshot.create.mockResolvedValue({});
      prisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

      await service.applyEpochRoi('portfolio-1', 0.0025);

      // balance was 500.00, new balance = 500 * 1.0025 = 501.25
      expect(txMock.portfolio.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'portfolio-1' },
          data: expect.objectContaining({
            balance: expect.closeTo(501.25, 5),
            totalEarnings: { increment: expect.closeTo(1.25, 5) },
          }),
        }),
      );
      expect(txMock.portfolioSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ portfolioId: 'portfolio-1' }) }),
      );
    });

    it('skips update when portfolio does not exist', async () => {
      txMock.portfolio.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

      await service.applyEpochRoi('missing-id', 0.0025);

      expect(txMock.portfolio.update).not.toHaveBeenCalled();
      expect(txMock.portfolioSnapshot.create).not.toHaveBeenCalled();
    });
  });
});
