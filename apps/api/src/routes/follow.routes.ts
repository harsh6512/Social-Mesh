import { verifyJWT } from '../middlewares/auth.middleware.js';
import { Router } from 'express';
import {
    followUnfollowUser,
    getFollowers,
    getFollowing,
    removeFollower,
    getFollowSuggestions,
    getFollowersByIntention,
    getFollowingByIntention,
    followStatus,
} from '../controllers/follow.controller.js'

const router=Router()
router.route('/:id/follow').post(verifyJWT, followUnfollowUser)
router.route('/:id/followers').get(verifyJWT, getFollowers);
router.route('/:id/following').get(verifyJWT, getFollowing);
router.route('/followers/:id').delete(verifyJWT, removeFollower);
router.route('/suggestions').get(verifyJWT, getFollowSuggestions);
router.route('/:id/followers/:intention').get(verifyJWT, getFollowersByIntention);
router.route('/:id/following/:intention').get(verifyJWT, getFollowingByIntention);
router.route('/:id/follow-status').get(verifyJWT, followStatus);
export default router