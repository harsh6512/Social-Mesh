import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Response, CookieOptions } from 'express';
import { prisma } from '../db/index.js';
import { Prisma } from '@prisma/client';
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

const getUserNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id
    const limit = Math.min(parseInt(req.params.query as string) || 10, 50)
    const cursorParam = req.query.cursor as string | undefined

    const cursor = cursorParam ? parseInt(cursorParam) : undefined
    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor id")

    type NotificationResult = {
        id: number,
        type: "Follow" | "Comment" | "Like" | "Quick_Connect" | "Direct_Message";
        message: string,
        isRead: boolean,
        sender: {
            profile: {
                profilePic: string
            }
        },
        post: {
            mediaUrl: string | null,
            thumbnailUrl: string | null
        }
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // First, find notifications
        const notifications = await tx.notification.findMany({
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" },
            where: {
                recipientId: userId
            },
            select: {
                id: true,
                type: true,
                message: true,
                isRead: true,
                sender: {
                    select: {
                        profile: {
                            select: {
                                profilePic: true,
                            }
                        },
                    }
                },
                post: {
                    select: {
                        mediaUrl: true,
                        thumbnailUrl: true,
                    }
                }
            }
        })

        const hasMore = notifications.length > limit
        const trimmedNotifications = hasMore ? notifications.slice(0, limit) : notifications

        // Update only the notifications we're returning as read
        if (trimmedNotifications.length > 0) {
            await tx.notification.updateMany({
                where: {
                    id: { in: trimmedNotifications.map((n: NotificationResult) => n.id) },
                    recipientId: userId
                },
                data: {
                    isRead: true
                }
            })
        }

        return {
            trimmedNotifications,
            hasMore
        }
    })

    const nextCursor = result.hasMore ? result.trimmedNotifications[result.trimmedNotifications.length - 1]?.id : null;

    const formattedNotifications = result.trimmedNotifications.map((n: NotificationResult) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        senderProfilePic: n.sender.profile.profilePic,
        mediaUrl: n.post.mediaUrl,
        thumbnailUrl: n.post.thumbnailUrl
    }))

    return res
        .status(200)
        .json(new ApiResponse(200, {
            notifications: formattedNotifications,
            hasMore: result.hasMore,
            cursor: nextCursor,
        }, "User notifications fetched successfully"))
})

const deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const notificationIdParam = req.params.id as string
    if (!notificationIdParam) throw new ApiError(400, "Notification id is Required")

    const notificationId = parseInt(notificationIdParam)
    if (isNaN(notificationId)) throw new ApiError(400, "Invalid notification id")

    const notification = await prisma.notification.findUnique({
        where: {
            id: notificationId
        },
        select: {
            recipientId: true,
        }
    })

    if (!notification) throw new ApiError(404, "Notification not found")

    if (notification.recipientId != req.user.id) throw new ApiError(403, " Unauthorized Request")

    await prisma.notification.delete({
        where: {
            id: notificationId
        }
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Notification deleted successfully"))
})

export {
    registerFcmToken,
    getUserNotifications,
    deleteNotification,
}