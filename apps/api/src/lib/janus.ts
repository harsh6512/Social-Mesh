import WebSocket from "ws";
import { ENV } from "../constants/env.js";

const janusWS = new WebSocket(ENV.JANUS_WS_URL);

janusWS.on("open", () => {
  console.log("Connected to Janus WebSocket");
});

janusWS.on("error", (err) => {
  console.error("Janus WS error:", err);
});

janusWS.on("close", () => {
  console.log("Janus WS connection closed");
});

export { janusWS };