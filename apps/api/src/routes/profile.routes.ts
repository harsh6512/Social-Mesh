import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    completeProfile,
    editProfile,
 } from "../controllers/profile.controller.js";
import { upload } from "../middlewares/multer.middlware.js";
const router = Router()

router.route("/complete-profile").post(verifyJWT,upload.single("profilePic"),completeProfile)
router.route("/edit-profile").post(verifyJWT,upload.single("profilePic"),editProfile)
export default router