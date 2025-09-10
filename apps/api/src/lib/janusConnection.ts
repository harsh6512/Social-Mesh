import WebSocket from "ws";
import { ENV } from "../constants/env.js";
import { Janus } from "./janus.js";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  type: string;
}

class JanusConnectionManager {
  private static ws: WebSocket;
  private static pendingRequests: Map<string, {instance: Janus, request: PendingRequest}> = new Map();
  private static isInitialized = false;
  
  public static initialize() {
    if (!JanusConnectionManager.isInitialized) {
      JanusConnectionManager.ws = new WebSocket(ENV.JANUS_URL, "janus-protocol");
      JanusConnectionManager.setupEventHandlers();
      JanusConnectionManager.isInitialized = true;
    }
  }
  
  public static addPendingRequest(transaction: string, instance: Janus, request: PendingRequest) {
    JanusConnectionManager.pendingRequests.set(transaction, { instance, request });
  }
  
  public static send(message: any) {
    if (JanusConnectionManager.ws.readyState === WebSocket.OPEN) {
      JanusConnectionManager.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket not open, cannot send message");
    }
  }
  
  private static setupEventHandlers() {
    JanusConnectionManager.ws.on("open", () => {
      console.log("Connected to Janus WebSocket");
    });

    JanusConnectionManager.ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      JanusConnectionManager.routeMessage(message);
    });

    JanusConnectionManager.ws.on("error", (err) => {
      console.log("Janus connection error: ", err);
    });

    JanusConnectionManager.ws.on("close", () => {
      console.error("Janus connection closed");
      // Reject all pending requests
      JanusConnectionManager.pendingRequests.forEach(({ request }) => {
        request.reject(new Error("Connection closed"));
      });
      JanusConnectionManager.pendingRequests.clear();
      JanusConnectionManager.isInitialized = false;
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
    // Handle events without transaction (rare cases)
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
}

export { JanusConnectionManager };
