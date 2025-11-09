// Backend Server for ESP8266 Device Management
// Run with: node server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const devices = new Map();
const sessions = new Map();
const webClients = new Set();

// -------------------
// WebSocket Handlers
// -------------------
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/ws/devices') {
    console.log('✅ Web client connected');
    webClients.add(ws);

    // Send current device list
    ws.send(JSON.stringify({
      type: 'devices_list',
      devices: Array.from(devices.values()).map(d => ({
        deviceId: d.deviceId,
        name: d.name,
        status: d.status,
        lastSeen: d.lastSeen,
        firmwareVersion: d.firmwareVersion,
        capabilities: d.capabilities
      }))
    }));

    ws.on('close', () => {
      console.log('❌ Web client disconnected');
      webClients.delete(ws);
    });
  }

  // ------------------------
  // ESP8266 Device Connection
  // ------------------------
  else if (path === '/ws/esp8266') {
    console.log('🔌 ESP8266 attempting connection...');
    let deviceId = null;

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);

        // -------- Registration Message --------
        if (data.type === 'register') {
          deviceId = data.deviceId || uuidv4();

          const deviceInfo = {
            deviceId,
            name: data.name || `ESP8266-${deviceId.slice(0, 8)}`,
            firmwareVersion: data.firmwareVersion || '1.0.0',
            capabilities: data.capabilities || [],
            publicIp: req.socket.remoteAddress,
            lastSeen: new Date().toISOString(),
            status: 'online',
            samplingRate: data.samplingRate || 1000,
            cameraResolution: data.cameraResolution || '640x480',
            compressionEnabled: data.compressionEnabled ?? true,
            otaEnabled: data.otaEnabled ?? false,
            ws
          };

          devices.set(deviceId, deviceInfo);
          console.log(`✅ Device registered: ${deviceId}`);

          ws.send(JSON.stringify({
            type: 'registration_ack',
            deviceId,
            status: 'success'
          }));

          broadcastToWebClients({
            type: 'device_registered',
            device: deviceInfo
          });
        }

        // -------- Heartbeat Message --------
        else if (data.type === 'heartbeat') {
          if (!deviceId) return;

          const device = devices.get(deviceId);
          if (!device) return;

          device.lastSeen = new Date().toISOString();
          device.status = 'online';
          devices.set(deviceId, device);

          // Broadcast heartbeat summary to web clients
          broadcastToWebClients({
            type: 'device_heartbeat',
            deviceId,
            uptime: data.uptime,
            rssi: data.rssi,
            summary: data.summary,
            timestamp: data.timestamp
          });
        }

        // -------- Configuration Updates --------
        else if (data.type === 'config_update_ack') {
          console.log(`✅ ${deviceId} acknowledged config update.`);
        }

        // -------- Session or AI Events --------
        else if (data.type === 'session_start_ack') {
          console.log(`🎬 ${deviceId} started session: ${data.sessionId}`);
        } else if (data.type === 'ai_log') {
          handleAILog(deviceId, data);
        }

      } catch (err) {
        console.error('❌ Error parsing ESP8266 message:', err.message);
      }
    });

    ws.on('close', () => {
      if (deviceId) {
        console.log(`⚠️ Device disconnected: ${deviceId}`);
        if (devices.has(deviceId)) {
          const device = devices.get(deviceId);
          device.status = 'offline';
          devices.set(deviceId, device);

          broadcastToWebClients({
            type: 'device_disconnected',
            deviceId
          });
        }
      }
    });

    ws.on('error', (err) => {
      console.error('⚠️ ESP8266 WebSocket error:', err.message);
    });
  }
});

// -------------------
// Helper Functions
// -------------------
function broadcastToWebClients(data) {
  const msg = JSON.stringify(data);
  webClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function handleAILog(deviceId, data) {
  console.log(`🤖 AI Log from ${deviceId}:`, data.event || 'No event');
}

// -------------------
// REST API Endpoints
// -------------------

// Get all devices
app.get('/api/devices', (req, res) => {
  const list = Array.from(devices.values()).map(d => ({
    deviceId: d.deviceId,
    name: d.name,
    status: d.status,
    lastSeen: d.lastSeen,
    firmwareVersion: d.firmwareVersion,
    capabilities: d.capabilities,
    rssi: d.rssi
  }));
  res.json({ devices: list });
});

// Send configuration update to device
app.put('/api/devices/:deviceId/configure', (req, res) => {
  const { deviceId } = req.params;
  const config = req.body;

  if (!devices.has(deviceId))
    return res.status(404).json({ error: 'Device not found' });

  const device = devices.get(deviceId);
  Object.assign(device, config);

  devices.set(deviceId, device);

  // Push config to live device
  if (device.ws && device.ws.readyState === WebSocket.OPEN) {
    device.ws.send(JSON.stringify({
      type: 'config_update',
      config
    }));
  }

  res.json({ success: true, device });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedDevices: devices.size,
    webClients: webClients.size
  });
});

// -------------------
// Start Server
// -------------------
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket endpoints:`);
  console.log(`  - ws://<your-lan-ip>:${PORT}/ws/esp8266`);
  console.log(`  - ws://<your-lan-ip>:${PORT}/ws/devices`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, closing server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
