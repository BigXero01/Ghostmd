import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface SocialProfile {
  email: string;
  providerId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

const APPLE_ISSUER = 'https://appleid.apple.com';

/**
 * Verifies identity tokens issued by Google and Apple. The web client obtains
 * these tokens via the providers' browser SDKs and forwards them here; we never
 * handle the user's provider password.
 */
@Injectable()
export class SocialVerifierService {
  private googleClient: OAuth2Client;
  private appleJwks = createRemoteJWKSet(
    new URL(`${APPLE_ISSUER}/auth/keys`),
  );

  constructor(private config: ConfigService) {
    this.googleClient = new OAuth2Client();
  }

  async verifyGoogle(idToken: string): Promise<SocialProfile> {
    const audience = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!audience) {
      throw new InternalServerErrorException('Google sign-in is not configured');
    }

    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({ idToken, audience });
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Google token missing email');
    }

    return {
      email: payload.email.toLowerCase(),
      providerId: payload.sub,
      firstName: payload.given_name,
      lastName: payload.family_name,
      avatarUrl: payload.picture,
      emailVerified: payload.email_verified === true,
    };
  }

  async verifyApple(idToken: string): Promise<SocialProfile> {
    const audience = this.config.get<string>('APPLE_CLIENT_ID');
    if (!audience) {
      throw new InternalServerErrorException('Apple sign-in is not configured');
    }

    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, this.appleJwks, {
        issuer: APPLE_ISSUER,
        audience,
      }));
    } catch {
      throw new UnauthorizedException('Invalid Apple token');
    }

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    if (!email || !payload.sub) {
      throw new UnauthorizedException('Apple token missing email');
    }

    return {
      email: email.toLowerCase(),
      providerId: payload.sub,
      emailVerified:
        payload.email_verified === true || payload.email_verified === 'true',
    };
  }
}
