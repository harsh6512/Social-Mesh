import { Request, Response, CookieOptions } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { validationErrors } from "../utils/validationErrors.js";

import { AuthenticatedRequest } from "../types/AuthenticatedRequest.js";

import {
    generateAccessAndRefreshTokens,
} from "../services/jwt.service.js";
import { comparePassword, hashPassword } from "../services/bcrypt.service.js";

import { prisma } from "../db/index.js";

import { AuthSchemas } from "@repo/common/schemas";

const signup = asyncHandler(async (req: Request, res: Response) => {
    const userInput = req.body

    const [existedUser, validationResult] = await Promise.all([
        prisma.user.findFirst({
            where: {
                OR: [
                    { email: userInput.email },
                    { username: userInput.username }
                ],
            },
        }),
        AuthSchemas.signupSchema.safeParse(userInput)
    ])

    if (existedUser) {
        throw new ApiError(409, "User with the given username or email already exist")
    }

    if (!validationResult.success) {
        validationErrors(validationResult)
    }
    const hashedPassword = await hashPassword(userInput.password)

    const user = await prisma.user.create({
        data: {
            fullName: userInput.fullName,
            username: userInput.username,
            email: userInput.email,
            dateOfBirth: userInput.dateOfBirth,
            password: hashedPassword,
            gender: userInput.gender,
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

    const [user, validationResult] = await Promise.all([
        prisma.user.findUnique({
            where: {
                username: userInput.username
            }
        }),
        AuthSchemas.signinSchema.safeParse(userInput)
    ]);

    if (!user) {
        throw new ApiError(404, "User with the given username doesn't exist")
    }

    if (!validationResult.success) {
        validationErrors(validationResult)
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
    await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null }
    })

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

const handleGoogleCallback = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    if (!user) {
        throw new ApiError(401, "Authentication failed")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user)

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
        .json(new ApiResponse(200, user, "User logged in successfully"))
})

export {
    signin,
    signup,
    logout,
    handleGoogleCallback
}