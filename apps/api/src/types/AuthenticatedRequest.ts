import { Request } from 'express';
import { User, Profile } from '../generated/prisma/index.js';

export interface AuthenticatedRequest extends Request {
  user: Omit<User, 'password' | 'refreshToken'> & {
    profile: Profile;
    deviceId:string;
  };
}

export interface OAuthRequest extends Request {
  user: Omit<User, 'password' | 'refreshToken'> & {
    profile: { id: number } | null;
  };
}