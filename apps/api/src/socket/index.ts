import { Server } from "socket.io";
import { quickConnectSocket } from "./quickConnect.js";

export const registerSockets=(io:Server)=>{
    quickConnectSocket(io)
}