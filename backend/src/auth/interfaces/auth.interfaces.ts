import type { Role } from '@prisma/client';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
