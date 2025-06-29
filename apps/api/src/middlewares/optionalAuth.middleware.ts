import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Request, Response, NextFunction } from 'express'
import { ENV } from "../constants/env.js"
import { prisma } from "../db/index.js"
import { sanitizeUser } from '../utils/sanitizeUser.js';
import jwt from 'jsonwebtoken'

export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        if (!token) {
            return next()
        }
        
        const decoded = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET);
        if (typeof decoded !== "object" || !("id" in decoded)) {
            console.warn("Invalid token payload");
            return next(); 
        }
        
        const decodedToken = decoded as jwt.JwtPayload;
        
        const user = await prisma.user.findUnique({
            where: {
                id: decodedToken?.id
            }
        })
        
        if (!user) {
            console.warn("User not found for token");
            return next();
        }
        
        const safeUser = sanitizeUser(user)
        req.user = safeUser;
        next();
        
    } catch (error: unknown) {
        console.warn("Optional auth failed:", error);
        req.user = undefined;
        return next();
    }
})