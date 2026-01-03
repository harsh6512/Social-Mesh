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

    public async createRoom(user1: User, user2: User) {
        const roomId = this.generateRoomId();

        await redis.hset(`room:${roomId}`, {
            user1: JSON.stringify({ socketId: user1.socket.id, name: user1.name }),
            user2: JSON.stringify({ socketId: user2.socket.id, name: user2.name }),
        });

        await redis.hset(`user:${user1.socket.id}`, { roomId });
        await redis.hset(`user:${user2.socket.id}`, { roomId });

        user1.socket.emit("send-offer", { roomId });
        user2.socket.emit("send-answer", { roomId });
    }

    public async onOffer(roomId: string, sdp: string, senderSocket: Socket) {
        const roomData = await redis.hgetall(`room:${roomId}`);
        if (!roomData || Object.keys(roomData).length < 2) return;

        const user1 = JSON.parse(roomData.user1!);
        const user2 = JSON.parse(roomData.user2!);

        const receivingUser = user1.socketId === senderSocket.id ? user2 : user1;
        if (!receivingUser?.socketId) return;

        const receivingSocket = this.io?.sockets.get(receivingUser.socketId);
        receivingSocket?.emit("offer", { sdp, roomId });
    }

    public async onAnswer(roomId: string, sdp: string, senderSocket: Socket) {
        const roomData = await redis.hgetall(`room:${roomId}`);
        if (!roomData || Object.keys(roomData).length < 2) return;

        const user1 = JSON.parse(roomData.user1!);
        const user2 = JSON.parse(roomData.user2!);

        const receivingUser = user1.socketId === senderSocket.id ? user2 : user1;
        if (!receivingUser?.socketId) return;

        const receivingSocket = this.io?.sockets.get(receivingUser.socketId);
        receivingSocket?.emit("answer", { sdp, roomId });
    }

    public async onIceCandidates(roomId: string, senderSocket: Socket, candidate: any) {
        const roomData = await redis.hgetall(`room:${roomId}`);
        if (!roomData || Object.keys(roomData).length < 2) return;

        const user1 = JSON.parse(roomData.user1!);
        const user2 = JSON.parse(roomData.user2!);

        const receivingUser = user1.socketId === senderSocket.id ? user2 : user1;
        if (!receivingUser?.socketId) return;

        const receivingSocket = this.io?.sockets.get(receivingUser.socketId);
        receivingSocket?.emit("add-ice-candidate", { candidate });
    }

    public async onUserDisconnected(socket: Socket) {
        const userData = await redis.hgetall(`user:${socket.id}`);
        const roomId = userData.roomId;
        if (!roomId) return;

        const roomData = await redis.hgetall(`room:${roomId}`);
        if (!roomData || Object.keys(roomData).length < 2) {
            await redis.del(`user:${socket.id}`);
            return;
        }

        const user1 = JSON.parse(roomData.user1!);
        const user2 = JSON.parse(roomData.user2!);

        const remainingUser = user1.socketId === socket.id ? user2 : user1;
        const remainingSocket = this.io?.sockets.get(remainingUser.socketId);

        remainingSocket?.emit("peer-disconnected", { roomId });

        await redis.del(`room:${roomId}`);
        await redis.del(`user:${socket.id}`);
        await redis.del(`user:${remainingUser.socketId}`);
    }

    public async leaveRoom(socket: Socket): Promise<string | null> {
        const userData = await redis.hgetall(`user:${socket.id}`);
        const roomId = userData.roomId;
        if (!roomId) return null;

        const roomData = await redis.hgetall(`room:${roomId}`);
        if (!roomData || Object.keys(roomData).length < 2) {
            await redis.del(`user:${socket.id}`);
            return null;
        }

        const user1 = JSON.parse(roomData.user1!);
        const user2 = JSON.parse(roomData.user2!);

        const remainingUser = user1.socketId === socket.id ? user2 : user1;
        const remainingSocket = this.io?.sockets.get(remainingUser.socketId);

        remainingSocket?.emit("peer-left", { roomId });

        await redis.del(`room:${roomId}`);
        await redis.del(`user:${socket.id}`);
        await redis.del(`user:${remainingUser.socketId}`);

        return remainingSocket ? remainingUser.socketId : null;
    }

    private generateRoomId(): string {
        const timestamp = Date.now().toString(36);
        const randomPart = crypto.randomBytes(8).toString("hex");
        return `${timestamp}${randomPart}`;
    }
}

const roomManager = new RoomManager();
export { roomManager };