import { Router } from "express";
import passport from "passport";
import { signup } from "../controllers/user.controller.js";
const router=Router()
 
// router.get('/auth/google',
//   passport.authenticate('google', { scope: ['profile', 'email'] })
// )

// router.get('/google/callback',passport.authenticate('google',{
// successRedirect:'',
// failureRedirect:'',
// }))
router.post("/signup",signup)
export default router