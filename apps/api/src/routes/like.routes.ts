import { Router } from 'express';
import { 
    likeUnlikePost,
    likeUnlikeComment,
    getPostLikes,
    getUserLikedPosts,
 } from '../controllers/like.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router()

router.route('/post/:postId').post(verifyJWT,likeUnlikePost)
router.route('/comment/:commentId').post(verifyJWT,likeUnlikeComment)
router.route('/post/:postId').get(verifyJWT, getPostLikes); 
router.route('/user/posts').get(verifyJWT, getUserLikedPosts)

export default router