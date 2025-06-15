import express from 'express';
import cors from 'cors'
// import passport from 'passport'
// import './services/passport.service.js'
const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
// app.use(passport.initialize())

import userRouter from "./routes/user.routes.js"



app.use("/api/v1/users", userRouter)
export {app}