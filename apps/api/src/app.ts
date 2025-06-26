import express from 'express';
import cors from 'cors'
import passport from 'passport'
import './lib/passport.js'
import { errorHandler } from './middlewares/errorHandler.middleware.js'
import cookieParser from 'cookie-parser';
const app = express();

app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(cookieParser());
app.use(passport.initialize())

import userRouter from './routes/user.routes.js'
import profileRouter from './routes/profile.routes.js';
import authRouter from './routes/auth.routes.js';

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/profiles", profileRouter)
app.use(errorHandler)

app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to Social Mesh</h1>
    <a href="/api/v1/auth/google/signin">Sign in with Google</a>
    <a href="/api/v1/auth/google/signup">Sign up with Google</a>
  `);
});

export { app };
