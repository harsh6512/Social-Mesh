import express from 'express';
import cors from 'cors'
import passport from 'passport'
import './lib/passport.js'
import { errorHandler } from './middlewares/errorHandler.middleware.js'
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

const app = express();

app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(helmet());
app.use(cookieParser());
app.use(passport.initialize())

import userRouter from './routes/user.routes.js';
import profileRouter from './routes/profile.routes.js';
import authRouter from './routes/auth.routes.js';
import followRouter from './routes/follow.routes.js';
import postRouter from './routes/post.routes.js';
import likeRouter from './routes/like.routes.js';
import commentRouter from './routes/comment.routes.js';
import notificationRouter from './routes/notification.route.js'

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/profiles', profileRouter)
app.use('/api/v1/connection', followRouter)
app.use('/api/v1/posts', postRouter)
app.use('/api/v1/likes', likeRouter)
app.use('/api/v1/comments', commentRouter)
app.use('/api/v1/notification', notificationRouter)
app.use(errorHandler)

export { app };