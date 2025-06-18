import  {Redis} from "ioredis";
import { ENV } from "../constants/env.js";

const redis =new Redis({
    host:ENV.REDIS_HOST,
    port:parseInt(ENV.REDIS_PORT),
    password:ENV.REDIS_PASSWORD,
    db:0,
})

redis.on("connect",()=>{
    console.log("Connected to Redis");
})

redis.on("error",(err)=>{
    console.error("Redis connection error: ",err)
})

export {redis}