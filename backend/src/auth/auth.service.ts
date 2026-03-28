import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import type {
  GoogleProfile,
  JwtPayload,
  AuthResponse,
} from './interfaces/auth.interfaces';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async validateGoogleUser(profile: GoogleProfile) {
    return this.prisma.user.upsert({
      where: { googleId: profile.googleId },
      update: {
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
      create: {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });
  }

  async validateGoogleIdToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      return this.validateGoogleUser({
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name || payload.email!,
        avatarUrl: payload.picture,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Google token verification failed', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  generateTokens(user: {
    id: string;
    email: string;
    name: string;
    role: string;
  }): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
