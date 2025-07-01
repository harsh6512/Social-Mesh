import { verifyJWT } from '../middlewares/auth.middleware.js';
import { Router } from 'express';
import {
    followUnfollowUser,
    getFollowers,
    getFollowing,
    removeFollower,
    getFollowSuggestions,
} from '../controllers/follow.controller.js'

const router=Router()
router.route('/:id/follow').post(verifyJWT, followUnfollowUser)
router.route('/:id/followers').get(verifyJWT, getFollowers);
router.route('/:id/following').get(verifyJWT, getFollowing);
router.route('/followers/:id').delete(verifyJWT, removeFollower);
router.route('/suggestions').get(verifyJWT, getFollowSuggestions);
router.route('/:id/followers/:intention').get(verifyJWT, getFollowers);

export default router