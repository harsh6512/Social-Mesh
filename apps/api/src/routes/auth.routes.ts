import {Router} from 'express'
import passport from 'passport';
import {
  signin,
  signup,
  logout,
  handleGoogleCallback,
} from '../controllers/auth.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { ENV } from '../constants/env.js';

const router=Router()

router.route("/signup").post(signup)
router.route("/signin").post(signin)
router.route("/logout").post(verifyJWT, logout)

router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'consent',
  })
);

router.get('/google/callback', passport.authenticate('google', {
    session: false,
    failureRedirect: `${ENV.FRONTEND_URL}/login`,
}), handleGoogleCallback)

export default router