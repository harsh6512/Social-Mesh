import { redis } from "../lib/redis.js"
import crypto from "crypto";
import { Namespace, Socket } from "socket.io"

interface User {
    socket: Socket,
    name: string,
}

class RoomManager {
    private io: Namespace | null = null

    public setIOInstance(io: Namespace): void {
        this.io = io;
    }

    async createRoom(user1: User, user2: User) {
        const roomId = this.generateRoomId();

        await redis.hset(`room:${roomId}`, {
            user1: JSON.stringify({ socketId: user1.socket.id, name: user1.name }),
            user2: JSON.stringify({ socketId: user2.socket.id, name: user2.name }),
        })

        user1.socket.emit("send-offer", {
            roomId,
        })

        user2.socket.emit("send-answer", {
            roomId,
        })

    }
    async onOffer(roomId: string, sdp: string, senderSocket: Socket) {
        const roomData = await redis.hgetall(`room:${roomId}`);

        if (!roomData || Object.keys(roomData).length < 2) {
            return;
        }

        const user1 = JSON.parse(roomData.user1!);
        const user2 = JSON.parse(roomData.user2!);

        const receivingUser = user1.socketId === senderSocket.id ? user2 : user1;

        if (!receivingUser?.socketId) return;

        const receivingUserSocket = this.io?.sockets.get(receivingUser.socketId);
        if (receivingUserSocket) {
            receivingUserSocket.emit("offer", {
                sdp,
                roomId,
            })
        }
    }

    async onAnswer(roomId: string, sdp: string, senderSocket: Socket) {
        const roomData = await redis.hgetall(`room:${roomId}`);

        if (!roomData || Object.keys(roomData).length < 2) {
            return;
        }

        const user1 = JSON.parse(roomData.user1!);
        const user2 = JSON.parse(roomData.user2!);

        const receivingUser = user1.socketId === senderSocket.id ? user2 : user1;

        if (!receivingUser?.socketId) return;

        const receivingUserSocket = this.io?.sockets.get(receivingUser.socketId);
        if (receivingUserSocket) {
            receivingUserSocket.emit("answer", {
                sdp,
                roomId,
            })
        }
    }

    async onIceCandidates(roomId: string, senderSocket: Socket, candidate: any) {
        const roomData = await redis.hgetall(`room:${roomId}`);

        if (!roomData || Object.keys(roomData).length < 2) {
            return;
        }

        const user1 = JSON.parse(roomData.user1!);
        const user2 = JSON.parse(roomData.user2!);

        const receivingUser = user1.socketId === senderSocket.id ? user2 : user1;

        if (!receivingUser?.socketId) return;

        const receivingUserSocket = this.io?.sockets.get(receivingUser.socketId);
        if (receivingUserSocket) {
            receivingUserSocket.emit("add-ice-candidate", {
                candidate,
            })
        }
    }

    generateRoomId(): string {
        const timestamp = Date.now().toString(36);
        const randomPart = crypto.randomBytes(8).toString("hex");
        return `${timestamp}${randomPart}`;
    }
}

const roomManager = new RoomManager()
export { roomManager }