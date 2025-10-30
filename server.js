import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const esp32Clients = new Map();    // deviceId → ws
const dashboardClients = new Set(); // dashboard UI clients

// --- WebSocket setup ---
const wss = new WebSocketServer({ server, path: "/ws/devices" });
const wssEsp32 = new WebSocketServer({ server, path: "/ws/esp32" });

// Helper to broadcast to all dashboards
const broadcastToDashboards = (data) => {
  const json = JSON.stringify(data);
  dashboardClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(json);
  });
};

// --- Dashboard WS (/ws/devices) ---
wss.on("connection", (ws) => {
  console.log("✅ Dashboard connected");
  dashboardClients.add(ws);
  ws.send(JSON.stringify({ type: "devices_list", devices: [...esp32Clients.values()].map(d => d.meta) }));

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === "binary_cmd" && data.target && data.payloadHex) {
        const targetClient = esp32Clients.get(data.target);
        if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
          const buf = Buffer.from(data.payloadHex, "hex");
          targetClient.ws.send(buf);
          console.log(`📤 Sent binary to ${data.target}: ${data.payloadHex}`);
        }
      }
    } catch (err) {
      console.error("Error parsing dashboard message:", err);
    }
  });

  ws.on("close", () => {
    console.log("❌ Dashboard disconnected");
    dashboardClients.delete(ws);
  });
});

// --- ESP32 WS (/ws/esp32) ---
wssEsp32.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log("✅ ESP32 connected:", ip);

  let deviceId = null;

  ws.on("message", (msg) => {
    // Handle JSON or binary messages
    if (typeof msg === "string") {
      try {
        const data = JSON.parse(msg);
        if (data.type === "register") {
          deviceId = data.deviceId || `esp32-${Math.floor(Math.random() * 10000)}`;
          const meta = {
            deviceId,
            name: data.name || `ESP32-${deviceId.slice(-4)}`,
            firmwareVersion: data.firmware || "unknown",
            capabilities: data.capabilities || [],
            publicIp: ip,
            lastSeen: new Date().toISOString(),
          };
          esp32Clients.set(deviceId, { ws, meta });
          console.log(`📡 Registered ${deviceId}`);
          broadcastToDashboards({ type: "device_registered", device: meta });
        } else if (data.type === "heartbeat") {
          if (deviceId && esp32Clients.has(deviceId)) {
            esp32Clients.get(deviceId).meta.lastSeen = new Date().toISOString();
            broadcastToDashboards({ type: "device_heartbeat", deviceId, lastSeen: new Date().toISOString() });
          }
        }
      } catch (e) {
        console.log("⚠️ Non-JSON message:", msg);
      }
    } else if (msg instanceof Buffer) {
      // Binary frame from ESP32
      if (deviceId) {
        const hex = msg.toString("hex");
        broadcastToDashboards({ type: "device_binary", deviceId, hex });
        console.log(`📩 Binary from ${deviceId}: ${hex}`);
      }
    }
  });

  ws.on("close", () => {
    console.log(`❌ ESP32 disconnected: ${deviceId}`);
    if (deviceId && esp32Clients.has(deviceId)) {
      esp32Clients.delete(deviceId);
      broadcastToDashboards({ type: "device_disconnected", deviceId });
    }
  });
});

app.get("/", (_, res) => res.send("ESP32 Cloud Control Backend is running ✅"));

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
