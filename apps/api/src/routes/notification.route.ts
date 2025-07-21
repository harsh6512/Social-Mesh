import { Router } from 'express';
import{
    registerFcmToken
} from '../controllers/notification.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router()

router.route('/fcm-token').post(registerFcmToken);

export default router