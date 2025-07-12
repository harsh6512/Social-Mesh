import { Router } from 'express';
import { 
    postComment,
    deleteComment,
    editComment,
    getCommentById,
    getPostComments,
} from '../controllers/comment.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router()

router.route('/:postId').post(verifyJWT,postComment)
router.route('/:postId').get(verifyJWT,getPostComments)
router.route('/:commentId').delete(verifyJWT,deleteComment)
router.route('/:commentId').patch(verifyJWT,editComment)
router.route('/:commentId').get(verifyJWT,getCommentById)


export default router