import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Request, Response, NextFunction } from 'express'
import { ENV } from "../constants/env.js"
import { prisma } from "../db/index.js"
import { sanitizeUser } from '../utils/sanitizeUser.js';
import jwt from 'jsonwebtoken'

export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    try {
        if (!token) {
            return next()
        }
        const decoded = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET);
        if (typeof decoded !== "object" || !("id" in decoded)) {
            throw new ApiError(401, "Invalid token payload");
        }

        const decodedToken = decoded as jwt.JwtPayload;

        const user = await prisma.user.findUnique({
            where: {
                id: decodedToken?.id
            }
        })

        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }
        const safeUser = sanitizeUser(user)
        req.user = safeUser;
        next();
    } catch (error:unknown) {
        if (token) {
            console.warn("Invalid token provided:", error);
        }
        req.user = undefined;
        return next();
    }
})