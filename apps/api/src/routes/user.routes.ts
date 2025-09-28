import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyForgotPasswordToken } from "../middlewares/authForgetPasswordToken.middleware.js"
import { otpLimiter } from "../middlewares/otpLimiter.middleware.js";
import {
    forgotPassword,
    verifyOTP,
    resetPassword,
    refreshAccessToken,
    getCurrentUser,
    updateUserDetails
} from "../controllers/user.controller.js";
const router = Router()

router.route("/forgot-password").post(otpLimiter,forgotPassword)
router.route("/verify-OTP").post(verifyForgotPasswordToken, verifyOTP)
router.route("/reset-password").post(verifyForgotPasswordToken, resetPassword)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-user-details").post(verifyJWT, updateUserDetails)
export default router