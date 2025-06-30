import { verifyJWT } from '../middlewares/auth.middleware.js';
import { Router } from 'express';
import {
    followUnfollowUser,
    getFollowers,
    getFollowing,
} from '../controllers/follow.controller.js'

const router=Router()

router.route('/follow/:id/').post(verifyJWT,followUnfollowUser);
router.route('/followers/:id').get(verifyJWT, getFollowers);
router.route('/following/:id').get(verifyJWT,getFollowing)
export default router