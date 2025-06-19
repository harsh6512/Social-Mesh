import { Router } from "express";
// import passport from "passport";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {verifyForgotPasswordToken} from "../middlewares/authForgetPasswordToken.middleware.js"
import {
    signup,
    signin,
    logout,
    forgotPassword,
    verifyOTP,
    resetPassword
} from "../controllers/user.controller.js";
const router = Router()

// router.get('/auth/google',
//   passport.authenticate('google', { scope: ['profile', 'email'] })
// )

// router.get('/google/callback',passport.authenticate('google',{
// successRedirect:'',
// failureRedirect:'',
// }))
router.route("/signup").post(signup)
router.route("/signin").post(signin)
router.route("/logout").post(verifyJWT,logout)
router.route("/forgot-password").post(forgotPassword)
router.route("/verify-OTP").post(verifyForgotPasswordToken,verifyOTP)
router.route("/reset-password").post(verifyForgotPasswordToken,resetPassword)
export default router