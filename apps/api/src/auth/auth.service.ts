import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
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
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, kycStatus: user.kycStatus };
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
    if (!user) return; // don't reveal whether the address exists

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    // TODO: wire a MailerModule (e.g. @nestjs-modules/mailer) and send:
    //   Subject: "Reset your GhostMD password"
    //   Body: link to /auth/reset-password?token=<token>
    // The token is valid for 1 hour. Until email delivery is wired this
    // feature intentionally stores the token but cannot complete the flow.
    this.logger.warn(
      `Password reset token created for user ${user.id} — email delivery not yet configured`,
    );
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
      10,
    );
    const expiresAt = new Date(Date.now() + refreshExpiresDays * 24 * 60 * 60 * 1000);

    // Purge expired sessions for this user before creating a new one so the
    // table doesn't grow unbounded across repeated logins.
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({
        where: { userId: user.id, expiresAt: { lt: new Date() } },
      }),
      this.prisma.session.create({
        data: { userId: user.id, refreshToken, expiresAt },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      user,
    };
  }
}
