import { Router } from 'express';
import{
    registerFcmToken,
    getUserNotifications,
    deleteNotification,
} from '../controllers/notification.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router()

router.route('/fcm-token').post(verifyJWT,registerFcmToken);
router.route('/').get(verifyJWT,getUserNotifications);
router.route('/:id').delete(verifyJWT,deleteNotification)

export default router