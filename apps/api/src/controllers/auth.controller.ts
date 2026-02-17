import { Request, Response, CookieOptions } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { validationErrors } from "../utils/validationErrors.js";

import { OAuthRequest, AuthenticatedRequest } from "../types/AuthenticatedRequest.js";

import {
    generateAccessAndRefreshTokens,
    completeProfileToken,
} from "../services/jwt.service.js";
import { comparePassword, hashPassword } from "../services/bcrypt.service.js";

import { prisma } from "../db/index.js";

import { AuthSchemas } from "@repo/common/schemas";

const signup = asyncHandler(async (req: Request, res: Response) => {
    const userInput = req.body

    const validationResult = AuthSchemas.signupSchema.safeParse(userInput)

    if (!validationResult.success) {
        validationErrors(validationResult)
    }

    const existedUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: userInput.email },
                { username: userInput.username }
            ],
        },
    })

    console.log("How the fuck user is existing", existedUser)

    if (existedUser) {
        throw new ApiError(409, "User with the given username or email already exist")
    }

    const hashedPassword = await hashPassword(userInput.password)

    const user = await prisma.user.create({
        data: {
            fullName: userInput.fullName,
            username: userInput.username,
            email: userInput.email,
            password: hashedPassword,
            provider: "Credentials",
        }
    })

    if (!user) {
        throw new ApiError(500, "Something Went wrong while signing up")
    }

    const safeUser = sanitizeUser(user)
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(safeUser)


    const options: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, safeUser, "User signed up successfully")
        )

})

const signin = asyncHandler(async (req: Request, res: Response) => {
    const userInput = req.body

    const validationResult = AuthSchemas.signinSchema.safeParse(userInput)
    if (!validationResult.success) {
        validationErrors(validationResult)
    }

    const user = await prisma.user.findUnique({
        where: {
            username: userInput.username
        }
    })
    if (!user) {
        throw new ApiError(404, "User with the given username doesn't exist")
    }
  
    if (!user.password) {
        throw new ApiError(400, "This account was created using Google. Please sign in using Google.");
    }

    const isPasswordCorrect = await comparePassword(userInput.password, user.password)

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Password for the given username is incorrect")
    }

    const safeUser = sanitizeUser(user)
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(safeUser)

    const options: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, safeUser, "User signed in successfully")
        );
})

const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    //Update the user refresh token
    await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null }
    });

    // Update the current deive fcm token of the user 
    if (req.user.deviceId) {
        await prisma.fcmToken.updateMany({
            where: {
                userId: req.user.id,
                deviceId: req.user.deviceId
            },
            data: {
                isActive: false
            }
        });
    }

    const options: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const handleGoogleCallback = asyncHandler(async (req: OAuthRequest, res: Response) => {
    const user = req.user;

    if (!user) throw new ApiError(401, "Authentication failed");

    if (!user.profile) {
        const profileToken = completeProfileToken(user);

        const options: CookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
        };

        return res
            .status(200)
            .cookie("completeProfileToken", profileToken, options)
            .json(
                new ApiResponse(200, { next: "COMPLETE_PROFILE", user:user }, "Complete your profile")
            );
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user);

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
    });

    const options: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { next: "HOME", user: user }, "User logged in successfully"));
});

export {
    signin,
    signup,
    logout,
    handleGoogleCallback
}