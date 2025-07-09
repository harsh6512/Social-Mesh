import { Router } from 'express';
import {
    createPost,
    deletePost,
    updatePost,
    togglePublishStatus,
    getPostById,
    getDraftPosts,
    getHomePosts,
    getHomePostsByType,
} from '../controllers/post.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middlware.js'

const router = Router()

router.route('/home').get(verifyJWT, getHomePosts);
router.get('/home/:type', verifyJWT, getHomePostsByType);
router.route('/drafts').get(verifyJWT, getDraftPosts); 
router.route('/:postType').post(verifyJWT,
    upload.fields([
        { name: 'media', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ]),
    createPost)
router.route('/:postId').delete(verifyJWT, deletePost).patch(verifyJWT, updatePost).get(verifyJWT,getPostById)
router.route('/:postId/toggle-publish').patch(verifyJWT, togglePublishStatus);

export default router
