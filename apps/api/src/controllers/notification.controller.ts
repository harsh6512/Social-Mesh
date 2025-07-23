import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Response, CookieOptions } from 'express';
import { prisma } from '../db/index.js';
import crypto from 'crypto';
import { NotificationSchemas } from '@repo/common/schemas';
import { validationErrors } from '../utils/validationErrors.js';
import { generateAccessToken } from '../services/jwt.service.js';

const registerFcmToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const token = req.body.token;
    if (!token) throw new ApiError(400, "FCM token is required");

    const validationResult = NotificationSchemas.tokenSchema.safeParse({ token });
    if (!validationResult.success) validationErrors(validationResult);

    const newDeviceId = crypto.randomUUID();

    const result = await prisma.fcmToken.upsert({
        where: {
            token: token,
        },
        update: {
            isActive: true,
            userId: req.user.id
        },
        create: {
            token: token,
            deviceId: newDeviceId,
            userId: req.user.id,
        },
        select: {
            id: true,
            deviceId: true,
        }
    });

    const jwtPayload = {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        username: req.user.username,
        deviceId: result.deviceId,
    }

    const accessToken = generateAccessToken(jwtPayload)
    const options: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.clearCookie("accessToken", options)

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(new ApiResponse(200, { deviceId: result.deviceId }, "Fcm token registration done"))
});

export {
    registerFcmToken,
}