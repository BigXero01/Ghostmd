import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import {
  SocialProfile,
  SocialVerifierService,
} from './social-verifier.service';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private socialVerifier: SocialVerifierService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        portfolio: { create: {} },
      },
      select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true },
    });

    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, kycStatus: user.kycStatus };
  }

  async googleLogin(dto: GoogleLoginDto) {
    const profile = await this.socialVerifier.verifyGoogle(dto.idToken);
    return this.socialLogin(AuthProvider.GOOGLE, profile);
  }

  async appleLogin(dto: AppleLoginDto) {
    const profile = await this.socialVerifier.verifyApple(dto.idToken);
    // Apple omits the name from the token; fall back to what the client forwards.
    profile.firstName = profile.firstName || dto.firstName;
    profile.lastName = profile.lastName || dto.lastName;
    return this.socialLogin(AuthProvider.APPLE, profile);
  }

  private async socialLogin(provider: AuthProvider, profile: SocialProfile) {
    const select = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      kycStatus: true,
    };

    // Match an existing account by email so social and password logins for the
    // same person resolve to one vault, then link the provider if not already set.
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
      select: { ...select, provider: true },
    });

    if (user) {
      if (user.provider === AuthProvider.LOCAL) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { provider, providerId: profile.providerId },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          provider,
          providerId: profile.providerId,
          firstName: profile.firstName || 'Phantom',
          lastName: profile.lastName || 'Trader',
          avatarUrl: profile.avatarUrl,
          kycStatus: 'PENDING',
          portfolio: { create: {} },
        },
        select: { ...select, provider: true },
      });
    }

    const { provider: _provider, ...safeUser } = user;
    return this.generateTokens(safeUser);
  }

  async login(user: any) {
    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.session.delete({ where: { id: session.id } });
    return this.generateTokens(session.user);
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({ where: { refreshToken } });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
    ]);
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuidv4();
    const refreshExpiresDays = parseInt(
      this.config.get('REFRESH_TOKEN_EXPIRES_IN', '7d').replace('d', ''),
    );
    const expiresAt = new Date(Date.now() + refreshExpiresDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      user,
    };
  }
}
