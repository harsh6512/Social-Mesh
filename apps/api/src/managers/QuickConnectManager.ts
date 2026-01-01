import { Namespace, Socket } from "socket.io";
import { redis } from "../lib/redis.js"
import { roomManager } from "./RoomManager.js";

class QuickConnectManager {
    private io: Namespace | null = null;
    private isMatching: boolean = false;

    public setIOInstance(io: Namespace): void {
        this.io = io;
    }

    public async addUser(name: string, socket: Socket) {
        const socketId = socket.id;
        const userData = JSON.stringify({ name, socketId });

        await redis.hset("users", socketId, userData);
        await redis.rpush("queue", socketId);

        socket.emit("lobby");

        this.startMatchingUsers();
        this.initHandlers(socket);
    }

    public async removeUser(socket: Socket) {
        const socketId = socket.id;

        await redis.lrem("queue", 0, socketId);
        await redis.hdel("users", socketId);

        roomManager.onUserDisconnected(socket);
    }

    private startMatchingUsers(): void {
        if (this.isMatching) {
            // Already running, don't start another instance
            return;
        }

        this.isMatching = true;
        this.matchingLoop();
    }

    private async matchingLoop(): Promise<void> {
        try {
            while (true) {
                const length = await redis.llen("queue");

                if (length < 2) {
                    break;
                }

                const socketId1 = await redis.lpop("queue");
                const socketId2 = await redis.lpop("queue");

                if (!socketId1 || !socketId2) {
                    if (socketId1) await redis.lpush("queue", socketId1);
                    break;
                }

                const user1Data = await redis.hget("users", socketId1);
                const user2Data = await redis.hget("users", socketId2);

                if (!user1Data || !user2Data) {
                    // If user1 is valid, requeue
                    if (user1Data) {
                        await redis.rpush("queue", socketId1);
                    }
                    // If user2 is valid, requeue
                    if (user2Data) {
                        await redis.rpush("queue", socketId2);
                    }
                    continue;
                }

                const user1 = JSON.parse(user1Data)
                const user2 = JSON.parse(user2Data)

                const socket1 = this.io?.sockets.get(socketId1);
                const socket2 = this.io?.sockets.get(socketId2);

                if (!socket1 || !socket2) {
                    console.log("One or both sockets disconnected");
                    if (socket1) await redis.rpush("queue", socketId1);
                    if (socket2) await redis.rpush("queue", socketId2);
                    continue;
                }

                roomManager.createRoom(
                    { name: user1.name, socket: socket1 },
                    { name: user2.name, socket: socket2 }
                );
                
            }
        } catch (error) {
            console.error("Error in matching loop:", error);
        } finally {
            this.isMatching = false;
            console.log("Matching loop ended");
        }
    }

    private initHandlers(socket: Socket) {
        socket.on("room-left", async () => {
            roomManager.leaveRoom(socket);
            // Add back to queue
            await redis.rpush("queue", socket.id);
            // Restart matching if needed
            this.startMatchingUsers();
        });

        socket.on("offer", async ({ sdp, roomId }: { sdp: string, roomId: string }) => {
            await roomManager.onOffer(roomId, sdp, socket);
        });

        socket.on("answer", async ({ sdp, roomId }: { sdp: string, roomId: string }) => {
            await roomManager.onAnswer(roomId, sdp, socket);
        });

        socket.on("ice-candidate", async ({ candidate, roomId }: { candidate: any, roomId: string }) => {
            await roomManager.onIceCandidates(roomId, socket, candidate);
        });
    }
}

export const quickConnect = new QuickConnectManager();