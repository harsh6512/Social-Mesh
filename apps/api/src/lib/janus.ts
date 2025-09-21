import { JanusConnectionManager } from "./janusConnection.js";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  type: string;
}

class Janus {
  private sessionId: number | null = null;
  private publisherHandleId: number | null = null;
  private subscriberHandleId: number | null = null;
  private static connectionManager: JanusConnectionManager | null = null; // Static reference

  constructor() {
    if (!Janus.connectionManager) {
      Janus.connectionManager = new JanusConnectionManager();
    }
  }

  public async connect() {
    await JanusConnectionManager.initialize();
    await this.createSession();
  }

  private async createSession() {
    const transaction = this.generateTransaction();
    return new Promise((resolve, reject) => {
      Janus.connectionManager?.addPendingRequest(transaction, this, {
        resolve,
        reject: (error) => {
          console.error("Session creation failed:", error);
        },
        type: "createSession"
      });

      Janus.connectionManager?.send({
        janus: "create",
        transaction
      });
    });
  }

  private async attachPublisherPlugin() {
    if (!this.sessionId) return;

    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      Janus.connectionManager?.addPendingRequest(transaction, this, {
        resolve,
        reject: (error) => {
          console.error("Publisher plugin attachment failed:", error);
        },
        type: "attachPublisher"
      });

      Janus.connectionManager?.send({
        janus: "attach",
        plugin: "janus.plugin.videoroom",
        session_id: this.sessionId,
        transaction
      });
    })
  }

  private async attachSubscriberPlugin() {
    if (!this.sessionId) return;

    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      Janus.connectionManager?.addPendingRequest(transaction, this, {
        resolve,
        reject: (error) => {
          console.error("Subscriber plugin attachment failed:", error);
        },
        type: "attachSubscriber"
      });

      Janus.connectionManager?.send({
        janus: "attach",
        plugin: "janus.plugin.videoroom",
        session_id: this.sessionId,
        transaction
      });
    })
  }

  public async createRoom(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId || !this.publisherHandleId) {
        reject(new Error("Publisher handle not ready"));
        return;
      }

      const roomId = Math.floor(Math.random() * 1000000);
      const transaction = this.generateTransaction();

      Janus.connectionManager?.addPendingRequest(transaction, this, {
        resolve,
        reject,
        type: "createRoom"
      });

      Janus.connectionManager?.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.publisherHandleId,
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
      if (!this.sessionId || !this.publisherHandleId) {
        reject(new Error("Publisher handle not ready"));
        return;
      }

      const transaction = this.generateTransaction();

      Janus.connectionManager?.addPendingRequest(transaction, this, {
        resolve,
        reject,
        type: "destroyRoom"
      });

      Janus.connectionManager?.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.publisherHandleId,
        transaction,
        body: {
          request: "destroy",
          room: roomId
        }
      });
    });
  }

  public async joinAsPublisher(roomId: number, display: string): Promise<any> {
    const transaction = this.generateTransaction();
    return new Promise((resolve, reject) => {
      if (!this.sessionId || !this.publisherHandleId) {
        reject(new Error("Publisher handle not ready"));
        return;
      }
      Janus.connectionManager?.addPendingRequest(transaction, this, {
        resolve,
        reject,
        type: "joinAsPublisher"
      });

      Janus.connectionManager?.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.publisherHandleId,
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
      if (!this.sessionId || !this.publisherHandleId) {
        reject(new Error("Publisher handle not ready"));
        return;
      }

      const transaction = this.generateTransaction();

      Janus.connectionManager?.addPendingRequest(transaction, this, {
        resolve,
        reject,
        type: "publish"
      });

      Janus.connectionManager?.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.publisherHandleId,
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
      if (!this.sessionId || !this.subscriberHandleId) {
        reject(new Error("Subscriber handle not ready"));
        return;
      }

      const transaction = this.generateTransaction();

      Janus.connectionManager?.addPendingRequest(transaction, this, {
        resolve,
        reject,
        type: "joinAsSubscriber"
      });

      Janus.connectionManager?.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.subscriberHandleId,
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

  public async sendAnswerForSubscriber(roomId: number, answerSdp: string) {
    if (!this.sessionId || !this.subscriberHandleId) {
      throw new Error("Subscriber handle not ready");
    }

    const transaction = this.generateTransaction();

    return new Promise((resolve, reject) => {
      Janus.connectionManager?.addPendingRequest(transaction, this, {
        resolve,
        reject,
        type: "subscriberAnswer"
      });

      Janus.connectionManager?.send({
        janus: "message",
        session_id: this.sessionId,
        handle_id: this.subscriberHandleId,
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

  // Called by ConnectionManager when a message is routed to this instance
  public async processMessage(message: any, request: PendingRequest) {

    if (message.janus === "success" && !this.sessionId && message.data?.id) {
      this.sessionId = message.data.id;
      console.log(`Session created: ${this.sessionId}`);
      await this.attachPublisherPlugin();
    }

    else if (message.janus === "success" && this.sessionId && message.data?.id && !this.publisherHandleId) {
      this.publisherHandleId = message.data.id;
      console.log(`Publisher handle created: ${this.publisherHandleId}`);
      await this.attachSubscriberPlugin();
    }

    else if (message.janus === "success" && this.sessionId && message.data?.id && this.publisherHandleId && !this.subscriberHandleId) {
      this.subscriberHandleId = message.data.id;
      console.log(`Subscriber handle created: ${this.subscriberHandleId}`);
      console.log(`Janus ready - Session: ${this.sessionId}, Publisher: ${this.publisherHandleId}, Subscriber: ${this.subscriberHandleId}`);
    }

    if (message.janus === "success" || message.janus === "event") {
      request.resolve({
        success: true,
        data: message.data,
        plugindata: message.plugindata,
        jsep: message.jsep,
        event: message.janus === "event"
      });
    } else if (message.janus === "error") {
      request.reject(new Error(message.error?.reason || "Unknown error"));
    }
  }

  public async cleanup(): Promise<void> {
    try {
      if (this.sessionId) {
        const transaction = this.generateTransaction();
        
        Janus.connectionManager?.send({
          janus: "destroy",
          session_id: this.sessionId,
          transaction
        });
        
        console.log(`Janus session ${this.sessionId} destroyed`);
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  private generateTransaction(): string {
    return Math.random().toString(36).substring(2, 12);
  }

  public getSessionId(): number | null {
    return this.sessionId;
  }

  public getPublisherHandleId(): number | null {
    return this.publisherHandleId;
  }

  public getSubscriberHandleId(): number | null {
    return this.subscriberHandleId;
  }

  public isReady(): boolean {
    return !!(this.sessionId && this.publisherHandleId && this.subscriberHandleId);
  }
}

export { Janus }