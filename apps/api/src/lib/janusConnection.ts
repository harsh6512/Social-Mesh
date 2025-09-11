import WebSocket from "ws";
import { ENV } from "../constants/env.js";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  type: string;
}

class JanusConnectionManager {
  private static ws: WebSocket | null = null;
  private static pendingRequests: Map<string, { instance: any, request: PendingRequest }> = new Map();
  private static isInitializing: boolean = false

  constructor() {
    if (!JanusConnectionManager.ws && !JanusConnectionManager.isInitializing) {
      JanusConnectionManager.isInitializing = true;
      JanusConnectionManager.initialize();
    }
  }

  public static async initialize() {
    await JanusConnectionManager.setupConnection();
  }

  public static setupConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      JanusConnectionManager.ws = new WebSocket(ENV.JANUS_URL, "janus-protocol");

      JanusConnectionManager.ws.on("open", () => {
        JanusConnectionManager.isInitializing = false;
        console.log("Connected to Janus WebSocket");
        resolve();
      });

      JanusConnectionManager.ws.on("error", (err) => {
        JanusConnectionManager.isInitializing = false;
        console.log("Janus connection error: ", err);
        reject(err);
      });

      JanusConnectionManager.setupEventHandlers();
    });
  }

  public addPendingRequest(transaction: string, instance: any, request: PendingRequest) {
    if (!this.isConnectionReady()) console.error("WebSocket not open, cannot send message"); 
    JanusConnectionManager.pendingRequests.set(transaction, { instance, request });

    // Auto-cleanup after 30 seconds
    setTimeout(() => {
      if (JanusConnectionManager.pendingRequests.has(transaction)) {
        const { request } = JanusConnectionManager.pendingRequests.get(transaction)!;
        JanusConnectionManager.pendingRequests.delete(transaction);
        request.reject(new Error("Request timeout"));
      }
    }, 30000);
  }

  public send(message: any) {
    if (!this.isConnectionReady()) console.error("WebSocket not open, cannot send message"); 

    JanusConnectionManager.ws?.send(JSON.stringify(message));
  }

  private static setupEventHandlers() {
    if (!JanusConnectionManager.ws) return;

    JanusConnectionManager.ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      JanusConnectionManager.routeMessage(message);
    });

    JanusConnectionManager.ws.on("close", () => {
      console.error("Janus connection closed");
      // Reject all pending requests
      JanusConnectionManager.pendingRequests.forEach(({ request }) => {
        request.reject(new Error("Connection closed"));
      });
      JanusConnectionManager.pendingRequests.clear();
      JanusConnectionManager.ws = null;
    });
  }

  private static routeMessage(message: any) {
    const { transaction } = message;

    // Route messages with transactions directly to the requesting instance
    if (transaction && JanusConnectionManager.pendingRequests.has(transaction)) {
      const { instance, request } = JanusConnectionManager.pendingRequests.get(transaction)!;
      JanusConnectionManager.pendingRequests.delete(transaction);

      // Only the relevant instance processes this message
      instance.processMessage(message, request);
    }
    // Handle events without transaction
    else if (message.janus === "event") {
      console.log("Unhandled plugin event:", message.plugindata);
    }
    else if (message.janus === "error" && !transaction) {
      console.error("Unhandled Janus error:", message.error);
    }
    else {
      console.log("Unhandled message:", message);
    }
  }

  public isConnectionReady():boolean{
    return JanusConnectionManager.ws?.readyState === WebSocket.OPEN
  }
}

export { JanusConnectionManager };