import express from 'express';
import cors from 'cors'
// import passport from 'passport'
// import './services/passport.service.js'
import { errorHandler } from './middlewares/errorHandler.middleware.js'

const app = express();

app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
// app.use(passport.initialize())

import userRouter from "./routes/user.routes.js"

app.use("/api/v1/users", userRouter)
app.use(errorHandler)

export { app };
