import {Server,Socket} from "socket.io"

export const quickConnectSocket=(io:Server)=>{
    const quickConnectIO =io.of("/quick-connect");

    quickConnectIO .on("connection",(socket:Socket)=>{
        console.log("Quick-Connect socket connected")

        socket.on("disconnect",()=>{
            console.log("User disconnected")
        })
    })
}