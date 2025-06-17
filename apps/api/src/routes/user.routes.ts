import { Router } from "express";
// import passport from "passport";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    signup,
    signin,
    logout,
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
export default router