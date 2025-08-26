import { Server } from "socket.io";
import { quickConnectSocket } from "./quickCoonect.js";

export const registerSockets=(io:Server)=>{
    quickConnectSocket(io)
}