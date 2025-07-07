import {Router} from 'express'
import passport from 'passport';
import {
  signin,
  signup,
  logout,
  handleGoogleCallback,
} from '../controllers/auth.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router=Router()

router.route("/signup").post(signup)
router.route("/signin").post(signin)
router.route("/logout").post(verifyJWT, logout)

router.get('/google/signin',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'signin',
    prompt: 'consent',
  })
);

router.get('/google/signup',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'signup',
    prompt: 'consent',
  })
);

router.get('/google/callback', passport.authenticate('google', {
    session: false,
    successRedirect: '',
    failureRedirect: '',
}), handleGoogleCallback)

export default router