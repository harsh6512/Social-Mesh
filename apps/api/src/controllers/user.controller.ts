import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { comparePassword, hashPassword } from "../services/bcrypt.service.js";
import { signupSchema, signinSchema, forgetPasswordSchema, OTPSchema, passwordSchema } from "@repo/common/schemas";
import { Request, response, Response } from "express"
import { prisma } from "../db/index.js"
import { formatZodErrors } from "../utils/zodErrorFormatter.js";
import { generateAccessAndRefreshTokens, generateForgotPasswordToken } from "../services/jwt.service.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { CookieOptions } from "express";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest.js";
import { sendMail } from "../services/mail.service.js";
import { redis } from "../lib/redis.js";
import { generateOTP } from "../services/auth.service.js";
import jwt from "jsonwebtoken";

const signup = asyncHandler(async (req: Request, res: Response) => {
    const userInput = req.body
    const result = signupSchema.safeParse(userInput)
    if (!result.success) {
        const formattedErrors = result.error.format() as unknown as Record<string, { _errors: string[] }>;
        const errorMessages = formatZodErrors(formattedErrors);
        throw new ApiError(400, "Inputs are not correct", errorMessages)
    }

    const existedUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: userInput.email },
                { username: userInput.username }
            ],
        },
    });

    if (existedUser) {
        throw new ApiError(409, "User with the given username or email already exist")
    }

    const hashedPassword = await hashPassword(userInput.password)

    const user = await prisma.user.create({
        data: {
            fullName: userInput.fullName,
            username: userInput.username,
            email: userInput.email,
            dateOfBirth: userInput.dateOfBirth,
            password: hashedPassword,
            provider: "Credentials",
        }
    })

    if (!user) {
        throw new ApiError(500, "Something Went wrong while siging up")
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
    const result = signinSchema.safeParse(userInput)
    if (!result.success) {
        const formattedErrors = result.error.format() as unknown as Record<string, { _errors: string[] }>;
        const errorMessages = formatZodErrors(formattedErrors);
        throw new ApiError(400, "Inputs are not correct", errorMessages)
    }

    const user = await prisma.user.findUnique({
        where: {
            username: userInput.username
        }
    });

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

const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const userInput = req.body
    const result = forgetPasswordSchema.safeParse(userInput)
    if (!result.success) {
        const formattedErrors = result.error.format() as unknown as Record<string, { _errors: string[] }>;
        const errorMessages = formatZodErrors(formattedErrors);
        throw new ApiError(400, "Inputs are not correct", errorMessages)
    }
    const user = await prisma.user.findUnique({
        where: {
            email: userInput.email
        }
    })

    if (!user) {
        throw new ApiError(404, "User with given email doesn't exist")
    }
    const safeUser = sanitizeUser(user)

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
    const result = OTPSchema.safeParse(userInput)
    if (!result.success) {
        const formattedErrors = result.error.format() as unknown as Record<string, { _errors: string[] }>;
        const errorMessages = formatZodErrors(formattedErrors);
        throw new ApiError(400, "Inputs are not correct", errorMessages)
    }

    const email = req.body.email;
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
    const email = req.body.email
    const isVerified = await redis.get(`otp-verified:${email}`)
    if (!isVerified) {
        throw new ApiError(403, "OTP not verified or session expired")
    }

    const userInput = req.body
    const result = passwordSchema.safeParse(userInput)
    if (!result.success) {
        const formattedErrors = result.error.format() as unknown as Record<string, { _errors: string[] }>;
        const errorMessages = formatZodErrors(formattedErrors);
        throw new ApiError(400, "Inputs are not correct", errorMessages)
    }

    const hashedPassword = await hashPassword(userInput.password)

    const user=await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
    });
    const safeUser=sanitizeUser(user)
    await redis.del(`otp-verified:${email}`);
    await redis.del(`forgot-password:${email}`);

    const options: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
    }

    return res
    .status(200)
    .clearCookie("forgotPasswordToken",options)
    .json(new ApiResponse(200,safeUser,"Your password has been reset successfully"))
})

export {
    signup,
    signin,
    logout,
    forgotPassword,
    verifyOTP,
    resetPassword,
}