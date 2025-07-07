import {app} from "./app.js"
import dotenv from 'dotenv'
import connectDB from './db/index.js';

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