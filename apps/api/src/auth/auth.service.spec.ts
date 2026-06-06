import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
  compare: jest.fn(),
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// ── Prisma mock ────────────────────────────────────────────────────────────────
const mockUser = {
  id: 'user-1',
  email: 'ghost@ghostmd.io',
  firstName: 'Ghost',
  lastName: 'MD',
  kycStatus: 'PENDING',
  passwordHash: '$2b$12$hashed',
};

const mockSession = {
  id: 'session-1',
  userId: 'user-1',
  refreshToken: 'rt-uuid',
  expiresAt: new Date(Date.now() + 7 * 86400_000),
  user: mockUser,
};

const prisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  passwordReset: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
};

const jwtService = { sign: jest.fn().mockReturnValue('access.token.jwt') };
const configService = {
  get: jest.fn().mockImplementation((key: string, fallback?: string) => {
    if (key === 'REFRESH_TOKEN_EXPIRES_IN') return '7d';
    return fallback ?? null;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
  });

  // ── register ────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('creates user + portfolio and returns token response', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.session.deleteMany.mockResolvedValue({ count: 0 });
      prisma.session.create.mockResolvedValue(mockSession);

      const result = await service.register({
        email: 'ghost@ghostmd.io',
        password: 'Phantom@99',
        firstName: 'Ghost',
        lastName: 'MD',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'ghost@ghostmd.io' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('Phantom@99', 12);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ portfolio: { create: {} } }) }),
      );
      expect(result).toMatchObject({ accessToken: 'access.token.jwt', user: expect.objectContaining({ id: 'user-1' }) });
    });

    it('throws ConflictException when email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'ghost@ghostmd.io', password: 'Phantom@99', firstName: 'Ghost', lastName: 'MD' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── validateUser ────────────────────────────────────────────────────────────
  describe('validateUser', () => {
    it('returns safe user object when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('ghost@ghostmd.io', 'Phantom@99');

      expect(result).toMatchObject({ id: 'user-1', email: 'ghost@ghostmd.io' });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('returns null when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nobody@ghostmd.io', 'password');
      expect(result).toBeNull();
    });

    it('returns null when password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('ghost@ghostmd.io', 'WrongPass@1');
      expect(result).toBeNull();
    });
  });

  // ── refreshTokens ──────────────────────────────────────────────────────────
  describe('refreshTokens', () => {
    it('deletes old session and issues new tokens', async () => {
      prisma.session.findUnique.mockResolvedValue(mockSession);
      prisma.session.delete.mockResolvedValue(mockSession);
      prisma.session.deleteMany.mockResolvedValue({ count: 0 });
      prisma.session.create.mockResolvedValue(mockSession);

      const result = await service.refreshTokens('rt-uuid');

      expect(prisma.session.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { refreshToken: 'rt-uuid' } }),
      );
      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
      expect(result).toMatchObject({ accessToken: 'access.token.jwt' });
    });

    it('throws UnauthorizedException for unknown refresh token', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for expired session', async () => {
      prisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('deletes the session matching the refresh token', async () => {
      prisma.session.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('rt-uuid');

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { refreshToken: 'rt-uuid' } });
    });
  });

  // ── forgotPassword ─────────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('creates a reset token when the email exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordReset.create.mockResolvedValue({});

      await service.forgotPassword('ghost@ghostmd.io');

      expect(prisma.passwordReset.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });

    it('does not create a reset token for unknown email (no information leak)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword('nobody@ghostmd.io');

      expect(prisma.passwordReset.create).not.toHaveBeenCalled();
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    const validReset = {
      id: 'reset-1',
      userId: 'user-1',
      token: 'valid-token',
      used: false,
      expiresAt: new Date(Date.now() + 3600_000),
    };

    it('hashes the new password and marks the token used', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(validReset);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.passwordReset.update.mockResolvedValue({});

      await service.resetPassword('valid-token', 'NewPass@99');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass@99', 12);
      expect(prisma.passwordReset.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { used: true } }),
      );
    });

    it('throws BadRequestException for an invalid token', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'NewPass@99')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for an already-used token', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({ ...validReset, used: true });

      await expect(service.resetPassword('used-token', 'NewPass@99')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for an expired token', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        ...validReset,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.resetPassword('expired-token', 'NewPass@99')).rejects.toThrow(BadRequestException);
    });
  });
});
