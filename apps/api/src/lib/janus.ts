import { ENV } from "../constants/env.js";
import WebSocket from "ws";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  type: string;
}

class Janus {
  private ws: WebSocket
  private JANUS_URL = ENV.JANUS_URL;
  private pendingRequests: Map<string, PendingRequest> = new Map();

  constructor() {
    this.ws = new WebSocket(this.JANUS_URL, "janus-protocol");
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.ws.on("open", () => {
      console.log("Connected to Janus WebSocket");
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
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject }) => {
        reject(new Error("Connection closed"));
      });
      this.pendingRequests.clear();
    });
  }

  private handleMessage(message: any) {
    const { transaction } = message;

    // If the message is an "ack", just return (do nothing)
    if (message.janus === "ack") {
      return;
    }

    const pendingRequest = this.pendingRequests.get(transaction);
    if (!pendingRequest) {
      // Handle events without transaction
      if (message.janus === "event") {
        console.log("Plugin event:", message.plugindata);
      }
      else if (message.janus === "error") {
        console.error("Janus error:", message.error);
      }
      return;
    }

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

  private addPendingRequest(transaction: string, request: PendingRequest) {
    this.pendingRequests.set(transaction, request);

    setTimeout(() => {
      if (this.pendingRequests.has(transaction)) {
        this.pendingRequests.delete(transaction);
        request.reject(new Error("Request timeout"));
      }
    }, 30000);
  }

  public async allocateSessionAndHandles(): Promise<{
    sessionId: number;
    publisherHandleId: number;
    subscriberHandleId: number;
  }> {
    const sessionId = await this.createSession()
    const publisherHandleId = await this.attachPublisherPlugin(sessionId)
    const subscriberHandleId = await this.attachSubscriberPlugin(sessionId)

    return { sessionId, publisherHandleId, subscriberHandleId }
  }

  private async createSession(): Promise<number> {
    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      this.addPendingRequest(transaction, {
        resolve: (message: any) => {
          if (message?.data?.id) {
            resolve(message.data.id);
          } else {
            reject(new Error("Session ID missing in Janus response"));
          }
        },
        reject: (error) => {
          console.error("Session creation failed:", error);
          reject(error);
        },
        type: "createSession"
      });

      this.send({
        janus: "create",
        transaction
      });
    });
  }

  private send(message: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private async attachPublisherPlugin(sessionId: number): Promise<number> {
    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      this.addPendingRequest(transaction, {
        resolve: (message: any) => {
          if (message?.data?.id) {
            resolve(message.data.id);
          } else {
            reject(new Error("Publisher handle ID missing in Janus response"));
          }
        },
        reject: (error) => {
          console.error("Publisher plugin attachment failed:", error);
          reject(error);
        },
        type: "attachPublisher"
      });

      this.send({
        janus: "attach",
        plugin: "janus.plugin.videoroom",
        session_id: sessionId,
        transaction
      });
    });
  }

  private async attachSubscriberPlugin(sessionId: number): Promise<number> {
    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      this.addPendingRequest(transaction, {
        resolve: (message: any) => {
          if (message?.data?.id) {
            resolve(message.data.id);
          } else {
            reject(new Error("Subscriber handle ID missing in Janus response"));
          }
        },
        reject: (error) => {
          console.error("Subscriber plugin attachment failed:", error);
          reject(error);
        },
        type: "attachSubscriber"
      });

      this.send({
        janus: "attach",
        plugin: "janus.plugin.videoroom",
        session_id: sessionId,
        transaction
      });
    })
  }

  public async createRoom(sessionId: number, publisherHandleId: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const roomId = Math.floor(Math.random() * 1000000);
      const transaction = this.generateTransaction();

      this.addPendingRequest(transaction, {
        resolve: (message: any) => {
          if (message?.success) {
            resolve(roomId);
          } else {
            reject(new Error("Room creation failed"));
          }
        },
        reject: (error) => {
          console.error("Room creation failed:", error);
          reject(error);
        },
        type: "createRoom"
      });

      this.send({
        janus: "message",
        session_id: sessionId,
        handle_id: publisherHandleId,
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

  public async destroyRoom(roomId: number, sessionId: number, publisherHandleId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const transaction = this.generateTransaction();

      this.addPendingRequest(transaction, {
        resolve: (message: any) => {
          if (message?.success) {
            console.log(`Room ${roomId} destroyed successfully.`);
            resolve(true);
          } else {
            reject(new Error("Room destruction failed"));
          }
        },
        reject: (error) => {
          console.error("Room destruction failed:", error);
          reject(error);
        },
        type: "destroyRoom"
      });

      this.send({
        janus: "message",
        session_id: sessionId,
        handle_id: publisherHandleId,
        transaction,
        body: {
          request: "destroy",
          room: roomId
        }
      });
    });
  }

  public async joinAsPublisher(
    roomId: number,
    display: string,
    sessionId: number,
    publisherHandleId: number
  ): Promise<number> {
    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      this.addPendingRequest(transaction, {
        resolve: (message: any) => {
          if (message?.success && message?.plugindata?.data?.id) {
            const feedId = message.plugindata.data.id;
            console.log(`Joined room ${roomId} as publisher (${display}), feedId: ${feedId}`);
            resolve(feedId);
          } else {
            reject(new Error("Failed to join as publisher or feed ID missing"));
          }
        },
        reject: (error) => {
          console.error("Publisher join failed:", error);
          reject(error);
        },
        type: "joinAsPublisher"
      });

      this.send({
        janus: "message",
        session_id: sessionId,
        handle_id: publisherHandleId,
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

  public async publish(
    roomId: number,
    offerSdp: string,
    sessionId: number,
    publisherHandleId: number
  ): Promise<string> {
    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      this.addPendingRequest(transaction, {
        resolve: (message: any) => {
          if (message?.success && message?.jsep?.sdp) {
            const remoteAnswerSdp = message.jsep.sdp;
            console.log(`Publish successful for room ${roomId}, returning remote SDP.`);
            resolve(remoteAnswerSdp);
          } else {
            reject(new Error("Publish failed or SDP missing"));
          }
        },
        reject: (error) => {
          console.error("Publish failed:", error);
          reject(error);
        },
        type: "publish"
      });

      this.send({
        janus: "message",
        session_id: sessionId,
        handle_id: publisherHandleId,
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

  public async joinAsSubscriber(
    roomId: number,
    feedId: number,
    sessionId: number,
    subscriberHandleId: number
  ): Promise<string> {
    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      this.addPendingRequest(transaction, {
        resolve: (message: any) => {
          if (message?.success && message?.jsep?.sdp) {
            const sdpOffer = message.jsep.sdp;
            console.log(`Joined as subscriber for feed ${feedId}, returning SDP offer.`);
            resolve(sdpOffer);
          } else {
            reject(new Error("Failed to join as subscriber or SDP missing"));
          }
        },
        reject: (error) => {
          console.error("Join as subscriber failed:", error);
          reject(error);
        },
        type: "joinAsSubscriber"
      });

      this.send({
        janus: "message",
        session_id: sessionId,
        handle_id: subscriberHandleId,
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

  public async sendAnswerForSubscriber(
    roomId: number,
    answerSdp: string,
    sessionId: number,
    subscriberHandleId: number
  ): Promise<boolean> {
    if (!sessionId || !subscriberHandleId) {
      throw new Error("Subscriber handle not ready");
    }

    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      this.addPendingRequest(transaction, {
        resolve: (message: any) => {
          if (message?.success) {
            console.log(`Answer sent for subscriber in room ${roomId}`);
            resolve(true);
          } else {
            reject(new Error("Failed to send subscriber answer"));
          }
        },
        reject: (error) => {
          console.error("Failed to send subscriber answer:", error);
          reject(error);
        },
        type: "subscriberAnswer"
      });

      this.send({
        janus: "message",
        session_id: sessionId,
        handle_id: subscriberHandleId,
        transaction,
        body: {
          request: "start",
          room: roomId
        },
        jsep: {
          type: "answer",
          sdp: answerSdp
        }
      });
    });
  }

  public async cleanup(sessionId: number): Promise<void> {
    try {
      const transaction = this.generateTransaction();

      this.send({
        janus: "destroy",
        session_id: sessionId,
        transaction
      });

      console.log(`Janus session ${sessionId} destroyed`);
    }
    catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  private generateTransaction(): string {
    return Math.random().toString(36).substring(2, 12);
  }
}

const janus = new Janus()
export { janus };