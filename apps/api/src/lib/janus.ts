import WebSocket from "ws";
import { ENV } from "../constants/env.js";

const JANUS_URL = ENV.JANUS_URL 

const janus = new WebSocket(JANUS_URL,"janus-protocol");

janus.on("open", () => {
  console.log("Connected to Janus WebSocket");
});

janus.on("error", (err) => {
  console.error("Janus connection error: ", err);
});

janus.on("close", () => {
  console.log("Janus connection closed");
});

export { janus };