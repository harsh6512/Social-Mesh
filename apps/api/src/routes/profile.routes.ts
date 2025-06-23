import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    completeProfile,
    editProfile,
 } from "../controllers/profile.controller.js";
const router = Router()

router.route("/complete-profile").post(verifyJWT,completeProfile)
router.route("/edit-profile").post(verifyJWT,editProfile)
 export default router