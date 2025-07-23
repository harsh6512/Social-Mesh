import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/index.js';
import { ENV } from '../constants/env.js';
import { Request, Response, NextFunction } from 'express';
import { sanitizeUser } from '../utils/sanitizeUser.js';

export const verifyJWT = asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) throw new ApiError(401, "Unathorized request")

        const decoded = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET);
        if (typeof decoded !== "object" || !("id" in decoded)) throw new ApiError(401, "Invalid token payload");

        const decodedToken = decoded as jwt.JwtPayload;

        const user = await prisma.user.findUnique({
            where: {
                id: decodedToken?.id
            },
            include: {
                profile: true,
            }
        })
        if (!user) throw new ApiError(401, "Invalid Access Token")

        if (!user.profile?.id) throw new ApiError(403, "Complete your profile to perform this action")

        const safeUser = {
           ...sanitizeUser(user),
          ...(decodedToken.deviceId && { deviceId: decodedToken.deviceId })
        }
        req.user = safeUser;
        next();
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new ApiError(401, error.message);
        }
        throw new ApiError(401, "Something went wrong");
    }
})