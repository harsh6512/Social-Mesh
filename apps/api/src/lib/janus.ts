import WebSocket from "ws";
import { ENV } from "../constants/env.js";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  type: string;
}

class Janus {
  private ws: WebSocket;
  private sessionId: number | null = null;
  private handleId: number | null = null;
  private JANUS_URL = ENV.JANUS_URL;
  private pendingRequests: Map<string, PendingRequest> = new Map();

  constructor() {
    this.ws = new WebSocket(this.JANUS_URL, "janus-protocol");
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.ws.on("open", () => {
      console.log("Connected to Janus WebSocket");

      this.send({
        janus: "create",
        transaction: this.generateTransaction(),
      });
    });

    this.ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });

    this.ws.on("error", (err) => {
      console.log("Janus connection error: ", err);
    });

    this.ws.on("close", () => {
      console.error("Janus connection closed");
      this.sessionId = null;
      this.handleId = null;
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject }) => {
        reject(new Error("Connection closed"));
      });
      this.pendingRequests.clear();
    });
  }

  private handleMessage(message: any) {
    const { transaction } = message;

    // Handle initial session creation
    if (message.janus === "success" && !this.sessionId && message.data?.id) {
      this.sessionId = message.data.id;
      this.attachVideoRoomPlugin();
    }

    // Handle plugin attachment
    else if (message.janus === "success" && this.sessionId && message.data?.id && !this.handleId) {
      this.handleId = message.data.id;
    }
    // Handle transaction-based responses
    else if (transaction && this.pendingRequests.has(transaction)) {

      // If the message is an "ack", just return (do nothing)
      if (message.janus === "ack") {
        return;
      }

      const pendingRequest = this.pendingRequests.get(transaction)!;
      this.pendingRequests.delete(transaction);

      if (message.janus === "success") {
        pendingRequest.resolve({
          success: true,
          data: message.data,
          plugindata: message.plugindata,
          jsep: message.jsep
        });
      } else if (message.janus === "event") {
        pendingRequest.resolve({
          success: true,
          event: true,
          plugindata: message.plugindata,
          jsep: message.jsep
        });
      } else if (message.janus === "error") {
        pendingRequest.reject(new Error(message.error?.reason || "Unknown error"));
      }
    }
    // Handle events without transaction
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

  public async createRoom(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId || !this.handleId) {
        reject(new Error("Janus not ready"));
        return;
      }

      const roomId = Math.floor(Math.random() * 1000000);
      const transaction = this.generateTransaction();

      this.pendingRequests.set(transaction, {
        resolve,
        reject,
        type: "createRoom"
      });

      this.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.handleId,
        transaction,
        body: {
          request: "create",
          room: roomId,
          publishers: 2,
          permanent: false
        }
      });
    });
  }

  public async destroyRoom(roomId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId || !this.handleId) {
        reject(new Error("Janus not ready"));
        return;
      }

      const transaction = this.generateTransaction();

      this.pendingRequests.set(transaction, {
        resolve,
        reject,
        type: "destroyRoom"
      });

      this.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.handleId,
        transaction,
        body: {
          request: "destroy",
          room: roomId
        }
      });
    });
  }

  public async joinAsPublisher(roomId: number, display: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId || !this.handleId) {
        reject(new Error("Janus not ready"));
        return;
      }

      const transaction = this.generateTransaction();

      this.pendingRequests.set(transaction, {
        resolve,
        reject,
        type: "joinAsPublisher"
      });

      this.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.handleId,
        transaction,
        body: {
          request: "join",
          room: roomId,
          ptype: "publisher",
          display
        }
      });
    });
  }

  public async publish(roomId: number, offerSdp: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId || !this.handleId) {
        reject(new Error("Janus not ready"));
        return;
      }

      const transaction = this.generateTransaction();

      this.pendingRequests.set(transaction, {
        resolve,
        reject,
        type: "publish"
      });

      this.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.handleId,
        transaction,
        body: {
          request: "publish",
          audio: true,
          video: true
        },
        jsep: {
          type: "offer",
          sdp: offerSdp
        }
      });
    });
  }

  public async joinAsSubscriber(roomId: number, feedId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId || !this.handleId) {
        reject(new Error("Janus not ready"));
        return;
      }

      const transaction = this.generateTransaction();

      this.pendingRequests.set(transaction, {
        resolve,
        reject,
        type: "joinAsSubscriber"
      });

      this.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.handleId,
        transaction,
        body: {
          request: "join",
          room: roomId,
          ptype: "subscriber",
          feed: feedId
        }
      });
    });
  }

  private send(message: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private generateTransaction(): string {
    return Math.random().toString(36).substring(2, 12);
  }

  public getSessionId(): number | null {
    return this.sessionId;
  }

  public getHandleId(): number | null {
    return this.handleId;
  }

  public isReady(): boolean {
    return !!(this.sessionId && this.handleId);
  }
}