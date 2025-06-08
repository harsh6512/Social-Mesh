import {app} from "./app"
import dotenv from 'dotenv'
import connectDB from './db';

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
     app.listen(process.env.PORT || 8000,()=>{
        console.log(`The server is running at the PORT ${process.env.PORT}`)
     })
})
.catch((error)=>{
    console.log("Mongo db connection failed",error)
})