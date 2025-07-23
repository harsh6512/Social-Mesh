import { Request } from 'express';
import { User, Profile } from '../generated/prisma/index.js';

export interface AuthenticatedRequest extends Request {
  user: Omit<User, 'password' | 'refreshToken'> & {
    profile: Profile;
    deviceId:string;
  };
}
