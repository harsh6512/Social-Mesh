import jwt from "jsonwebtoken";
import { ENV } from "../constants/env.js";
import { Request, Response, NextFunction } from "express"
import { ApiError } from "../utils/ApiError.js";

export const verifyForgotPasswordToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.forgotPasswordToken || req.header("Authorization")?.replace("Bearer ", "")
    if (!token) {
        throw new ApiError(401, "Unathorized Request")
    }

    const decoded = jwt.verify(token, ENV.FORGOTPASSWORD_TOKEN_SECRET) as jwt.JwtPayload;
    if (typeof decoded !== "object" || !("email" in decoded)) {
        throw new ApiError(401, "Invalid token payload");
    }
    
    req.body.email=decoded.email;
    next()
}

