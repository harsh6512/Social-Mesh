import { Router } from 'express';
import {
    createPost,
    deletePost,
    updatePost,
} from '../controllers/post.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middlware.js'

const router = Router()

router.route('/:postType').post(verifyJWT,
    upload.fields([
        { name: 'media', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ]),
    createPost)
router.route('/:postId').delete(verifyJWT,deletePost)
router.route('/:postId').patch(verifyJWT, updatePost);


export default router