import WebSocket from "ws";
import { ENV } from "../constants/env.js";

class Janus {
  private ws: WebSocket;
  private sessionId: number | null = null;
  private handleId: number | null = null;
  private JANUS_URL = ENV.JANUS_URL;

  constructor() {
    this.ws = new WebSocket(this.JANUS_URL, "janus-protocol");
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.ws.on("open", () => {
      console.log("Connected to Janus WebSocket")

      this.send({
        janus: "create",
        transaction: this.generateTransaction(),
      })
    })

    this.ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    })

    this.ws.on("error", (err) => {
      console.log("Janus connection error: ", err)
    });

    this.ws.on("close", () => {
      console.error("Janus connection closed");
      this.sessionId = null;
      this.handleId = null;
    })
  }

  private handleMessage(message: any) {
    if (message.janus === "success" && !this.sessionId && message.data.id) {
      this.sessionId = message.data.id
      this.attachVideoRoomPlugin();
    }
    else if (message.janus === "success" && this.sessionId && message.data?.id && !this.handleId) {
      this.handleId = message.data.id;
    }
    else if (message.janus === "event") {
      console.log("Plugin event:", message.plugindata);
    }

    else if (message.janus === "error") {
      console.error("Janus error:", message.error);
    }
  }

  private attachVideoRoomPlugin() {
    if (!this.sessionId) return;

    this.send({
      janus: "attach",
      plugin: "janus.plugin.videoroom",
      session_id: this.sessionId,
      transaction: this.generateTransaction()
    });
  }

  public async createRoom(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId || !this.handleId) {
        reject(new Error("Janus not ready"));
        return;
      }

      const roomId = Math.floor(Math.random() * 1000000);
      this.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.handleId,
        transaction: this.generateTransaction(),
        body: {
          request: "create",
          room: roomId,
          publishers: 2,
          permanent: false 
        }
      })
      resolve(roomId)
    })
  }

  public async destroyRoom(roomId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId || !this.handleId) {
        reject(new Error("Janus not ready"));
        return;
      }

      this.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.handleId,
        transaction: this.generateTransaction(),
        body: {
          request: "destroy",
          room: roomId
        }
      });
      resolve(true);
    });
  }

  private send(message: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private generateTransaction(): string {
    return Math.random().toString(36).substring(2, 12);
  }

  public getSessionId(): number | null {
    return this.sessionId
  }

  public getHandleId(): number | null {
    return this.handleId
  }

  public isReady(): boolean {
    return !!(this.sessionId && this.handleId)
  }
}

const janus = new Janus();
export { janus }