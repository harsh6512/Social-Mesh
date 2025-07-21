import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Response } from 'express';
import { prisma } from '../db/index.js';
import crypto from 'crypto';
import { NotificationSchemas } from '@repo/common/schemas';
import { validationErrors } from '../utils/validationErrors.js';

const registerFcmToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const token = req.body.token;
    if (!token) throw new ApiError(400, "FCM token is required");

    const validationResult = NotificationSchemas.tokenSchema.safeParse({ token })
    if (!validationResult.success) validationErrors(validationResult)

    const existingToken = await prisma.fcmToken.findUnique({
        where: {
            token: token,
        },
        select: {
            id: true,
            deviceId: true,
        }
    });

    if (existingToken) {
        await prisma.fcmToken.updateMany({
            where: {
                token: token,
                userId:req.user.id,
            },
            data: {
                isActive: true,
            }
        });

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "FCM Token updated successfully"));
    }

    const deviceId = crypto.randomUUID();

    await prisma.fcmToken.create({
        data: {
            token: token,
            deviceId: deviceId,
            userId:req.user.id,
        },
        select: {
            id: true,
        }
    });


    return res
        .status(201)
        .json(new ApiResponse(201, {}, "FCM Token created successfully"));
});

export {
    registerFcmToken,
}