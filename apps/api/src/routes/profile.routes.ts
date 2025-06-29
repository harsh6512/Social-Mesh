import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    completeProfile,
    editProfile,
    oauthCompleteProfile,
    getMYProfile,
    getPublicProfile
} from "../controllers/profile.controller.js";
import { upload } from "../middlewares/multer.middlware.js";
import { optionalAuth } from "../middlewares/optionalAuth.middleware.js";

const router = Router()

router.route("/complete-profile").post(verifyJWT, upload.single("profilePic"), completeProfile)
router.route("/edit-profile").post(verifyJWT, upload.single("profilePic"), editProfile)
router.route("/oauth/complete-profile").post(verifyJWT,upload.single("profilePic"),oauthCompleteProfile)
router.route("/profile").get(verifyJWT,getMYProfile)
router.route("/profile/:id").get(optionalAuth,getPublicProfile)
export default router