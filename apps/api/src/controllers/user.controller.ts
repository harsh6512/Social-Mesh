import { CookieOptions, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { ENV } from "../constants/env.js";

import { prisma } from "../db/index.js";
import { redis } from "../lib/redis.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { validationErrors } from "../utils/validationErrors.js";

import {
    generateAccessAndRefreshTokens,
    generateForgotPasswordToken
} from "../services/jwt.service.js";

import { generateOTP } from "../services/auth.service.js";
import { hashPassword } from "../services/bcrypt.service.js";
import { sendMail } from "../services/mail.service.js";

import { AuthenticatedRequest } from "../types/AuthenticatedRequest.js";

import { UserSchemas } from "@repo/common/schemas";

const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const userInput = req.body

    const [user, validationResult] = await Promise.all([
        prisma.user.findUnique({
            where: {
                email: userInput.email
            }
        }),
        UserSchemas.forgotPasswordSchema.safeParse(userInput)
    ])

    if (!user) {
        throw new ApiError(404, "User with given email doesn't exist")
    }
    const safeUser = sanitizeUser(user)

    if (!validationResult.success) {
        validationErrors(validationResult)
    }

    const rateLimitKey = `otp-requests:${safeUser.email}`;
    const currentCount = await redis.incr(rateLimitKey);

    if (currentCount === 1) {
        await redis.expire(rateLimitKey, 60 * 15);
    }

    if (currentCount > 3) {
        throw new ApiError(429, "Too many OTP requests. Please try again after 15 minutes")
    }

    const OTP = generateOTP();

    const otpkey = `forgot-password:${safeUser.email}`;
    const otpSetResult = await redis.set(otpkey, OTP, "EX", 60 * 5);
    if (otpSetResult !== "OK") {
        throw new ApiError(500, "Failed to store OTP. Please try again.");
    }

    const mailInfo = await sendMail(
        user.email,
        "Password Reset OTP - Social Mesh",
        `Your OTP for password reset is: ${OTP}. It will expire in 5 minutes.`
    );

    if (!mailInfo) {
        throw new ApiError(500, "Failed to send OTP email. Please try again.");
    }

    const forgotPassword_Token = generateForgotPasswordToken(safeUser)

    const options: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 5 * 60 * 1000,
    };

    return res
        .status(200)
        .cookie("forgotPasswordToken", forgotPassword_Token, options)
        .json(new ApiResponse(200, {}, "OTP generated successfully "))
})

const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const userInput = req.body
    const result = UserSchemas.OTPSchema.safeParse(userInput)
    if (!result.success) {
        validationErrors(result)
    }

    const email = userInput.email;
    const storedOtp = await redis.get(`forgot-password:${email}`);
    if (!storedOtp || storedOtp !== userInput.otp) {
        throw new ApiError(400, "Invalid or expired OTP");
    }

    const response = await redis.set(`otp-verified:${email}`, "true", "EX", 60 * 5);
    if (response !== "OK") {
        throw new ApiError(500, "Error while verifying the OTP");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "OTP verified successfully "))
})


const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const userInput = req.body
    const result = UserSchemas.passwordSchema.safeParse(userInput)
    if (!result.success) {
        validationErrors(result)
    }

    const email = userInput.email
    const isVerified = await redis.get(`otp-verified:${email}`)
    if (!isVerified) {
        throw new ApiError(403, "OTP not verified or session expired")
    }

    const hashedPassword = await hashPassword(userInput.password)

    const user = await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
    });
    const safeUser = sanitizeUser(user)
    await redis.del(`otp-verified:${email}`);
    await redis.del(`forgot-password:${email}`);

    const options: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
    }

    return res
        .status(200)
        .clearCookie("forgotPasswordToken", options)
        .json(new ApiResponse(200, safeUser, "Your password has been reset successfully"))
})

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const refreshtoken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;

    if (!refreshtoken) {
        throw new ApiError(401, "Unauthorized Request");
    }

    try {
        const decodedRefreshToken = jwt.verify(refreshtoken, ENV.REFRESH_TOKEN_SECRET) as jwt.JwtPayload;

        if (typeof decodedRefreshToken !== "object" || !("id" in decodedRefreshToken)) {
            throw new ApiError(401, "Invalid refresh token payload");
        }

        const user = await prisma.user.findUnique({
            where: {
                id: decodedRefreshToken.id
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                refreshToken: true,
            }
        });

        if (!user) {
            throw new ApiError(401, "User not found");
        }

        if (refreshtoken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        /**
         * Attempt to extract deviceId from the expired accessToken.
         * This helps preserve device information in the next token.
         */
        let deviceId = null;
        if (accessToken) {
            try {
                const decodedAccessToken = jwt.decode(accessToken) as jwt.JwtPayload;
                if (decodedAccessToken && typeof decodedAccessToken === "object" && "deviceId" in decodedAccessToken) {
                    deviceId = decodedAccessToken.deviceId;
                }
            } catch (error) {
                console.warn("Could not decode access token:", error);
            }
        }

        const jwtPayload = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            username: user.username,
            ...(deviceId && { deviceId: deviceId })
        };

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(jwtPayload);

        const options: CookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };

        return res
            .status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200, user, "Access Token Refreshed")
            );

    } catch (error: any) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const getCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched Successfully"))
})

const updateUserDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userInput = req.body;
    const result = UserSchemas.updateUserDetailsSchema.safeParse(userInput);
    if (!result.success) {
        validationErrors(result)
    }

    const [emailExists, usernameExists] = await Promise.all([
        prisma.user.findUnique({ where: { email: userInput.email } }),
        prisma.user.findUnique({ where: { username: userInput.username } })
    ]);

    if (emailExists && emailExists.id !== req.user.id) {
        throw new ApiError(409, "Email is already in use");
    }

    if (usernameExists && usernameExists.id !== req.user.id) {
        throw new ApiError(409, "Username is already taken");
    }

    const existingUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!existingUser) {
        throw new ApiError(404, "Profile not found");
    }

    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
            email: userInput.email ?? existingUser.email,
            username: userInput.username ?? existingUser.username,
            fullName: userInput.fullName ?? existingUser.fullName,
            dateOfBirth: userInput.dateOfBirth ?? existingUser.dateOfBirth
        }
    });
    const updatedUser = sanitizeUser(user)

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

export {
    forgotPassword,
    verifyOTP,
    resetPassword,
    refreshAccessToken,
    getCurrentUser,
    updateUserDetails
}