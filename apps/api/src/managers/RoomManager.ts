import { redis } from "../lib/redis.js"
import { Namespace, Socket } from "socket.io";
import { janus } from "../lib/janus.js"

interface User {
    socket: Socket,
    name: string,
}

class RoomManager {
    private io: Namespace | null = null

    public setIOInstance(io: Namespace): void {
        this.io = io;
    }

    public async initializeSessionAndHandles(user: User) {
        const { sessionId, publisherHandleId, subscriberHandleId } = await janus.allocateSessionAndHandles()

        await redis.hset(`janus:${user.socket.id}`, {
            sessionId: sessionId,
            publisherHandleId: publisherHandleId,
            subscriberHandleId: subscriberHandleId,
        });
    }

    public async createRoom(user1: User, user2: User) {

        const janusData = await redis.hgetall(`janus:${user1.socket.id}`);
        const sessionId = Number(janusData.sessionId);
        const publisherHandleId = Number(janusData.publisherHandleId);

        const roomId = await janus.createRoom(sessionId, publisherHandleId)

        await redis.hset(`room:${roomId}`, {
            user1: JSON.stringify({ socketId: user1.socket.id, name: user1.name }),
            user2: JSON.stringify({ socketId: user2.socket.id, name: user2.name }),
        });

        await redis.hset(`janus:${user1.socket.id}`, { roomId });
        await redis.hset(`janus:${user2.socket.id}`, { roomId });

        user1.socket.emit("start-publishing", { roomId });
        user2.socket.emit("start-publishing", { roomId });

    }

    public async handleUserPublish(sdp: string, display: string, clientSocket: Socket) {
        try {
            const janusData = await redis.hgetall(`janus:${clientSocket.id}`);

            const sessionId = Number(janusData.sessionId);
            const publisherHandleId = Number(janusData.publisherHandleId);
            const roomId = Number(janusData.roomId)

            const feedId = await janus.joinAsPublisher(roomId, display, sessionId, publisherHandleId);

            const remoteAnswerSdp = await janus.publish(roomId, sdp, sessionId, publisherHandleId);
            console.log("A error might be here", remoteAnswerSdp)

            clientSocket.emit("sdpAnswer", {
                type: "answer",
                sdp: remoteAnswerSdp
            });

            const roomData = await redis.hgetall(`room:${roomId}`);

            const user1 = JSON.parse(roomData.user1!);
            const user2 = JSON.parse(roomData.user2!);

            // Find the peer socket
            const peerSocketId = user1.socketId === clientSocket.id ? user2.socketId : user1.socketId;
            const peerSocket = this.io?.sockets.get(peerSocketId);

            if (!peerSocket) {
                console.error("Peer socket not found:", peerSocketId);
                return;
            }

            await this.handleUserSubscribe(peerSocket, roomId, feedId)
        } catch (error) {
            console.log("Error while joining as a publisher", error)
        }
    }

    public async handleUserSubscribe(clientSocket: Socket, roomId: number, feedId: number) {
        try {
            const janusData = await redis.hgetall(`janus:${clientSocket.id}`);

            const sessionId = Number(janusData.sessionId);
            const subscriberHandleId = Number(janusData.subscriberHandleId);

            const sdpoffer = await janus.joinAsSubscriber(roomId, feedId, sessionId, subscriberHandleId)
            clientSocket.emit("sdpoffer", sdpoffer)
        }
        catch (error) {
            console.log("Error while joining as subsciber", error)
        }
    }

    public async handleSubscribeAnswer(clientSocket: Socket, sdp: string) {
        try {
            const janusData = await redis.hgetall(`janus:${clientSocket.id}`);

            const sessionId = Number(janusData.sessionId);
            const subscriberHandleId = Number(janusData.subscriberHandleId);
            const roomId = Number(janusData.roomId);

            await janus.sendAnswerForSubscriber(roomId, sdp, sessionId, subscriberHandleId)
        } catch (error) {
            console.log("Error while sending subscribe answer", error);
            clientSocket.emit("error", {
                type: "Subscribe failed",
                message: "Could not complete subscription",
                code: 500,
            });
        }
    }

    public async handleRoomLeft(clientSocket: Socket) {
        try {
            const janusData = await redis.hgetall(`janus:${clientSocket.id}`);
            const sessionId = Number(janusData.sessionId);
            const publisherHandleId = Number(janusData.publisherHandleId);
            const roomId = Number(janusData.roomId);

            if (roomId) {
                await janus.destroyRoom(roomId, sessionId, publisherHandleId);
                await redis.hdel(`janus:${clientSocket.id}`, "roomId");

                const roomData = await redis.hgetall(`room:${roomId}`);
                await redis.del(`room:${roomId}`);

                const user1 = JSON.parse(roomData.user1!);
                const user2 = JSON.parse(roomData.user2!);

                const peerSocketId = user1.socketId === clientSocket.id ? user2.socketId : user1.socketId;
                const peerSocket = this.io?.sockets.get(peerSocketId);

                if (peerSocket) {
                    peerSocket.emit("Peer Left");
                }
            }
        } catch (err) {
            console.error("Error in handleRoomLeft:", err);
        }
    }

    public async handleUserLeft(clientSocket: Socket) {
        try {
            const janusData = await redis.hgetall(`janus:${clientSocket.id}`);
            const sessionId = Number(janusData.sessionId);
            const roomId = Number(janusData.roomId);

            if (roomId) {
                const roomData = await redis.hgetall(`room:${roomId}`);
                await redis.del(`room:${roomId}`);

                const user1 = JSON.parse(roomData.user1!);
                const user2 = JSON.parse(roomData.user2!);

                const peerSocketId = user1.socketId === clientSocket.id ? user2.socketId : user1.socketId;
                const peerSocket = this.io?.sockets.get(peerSocketId);

                if (peerSocket) {
                    peerSocket.emit("Peer Left");
                }
            }

            await redis.del(`janus:${clientSocket.id}`);
            await janus.cleanup(sessionId);
        } catch (err) {
            console.error("Error in handlerUserLeft:", err);
        }
    }

    public async handleTrickleCandidate(clientSocket: Socket, candidate: any) {
        const janusData = await redis.hgetall(`janus:${clientSocket.id}`);
        const sessionId = Number(janusData.sessionId);
        const publisherHandleId = Number(janusData.publisherHandleId)

        janus.sendTrickleCandidate(sessionId, publisherHandleId, candidate)
    }
}

const roomManager = new RoomManager()
export { roomManager }