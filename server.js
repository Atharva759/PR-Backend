// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Storage
const devices = new Map();    // deviceId -> { deviceId, name, ws, ... }
const sessions = new Map();
const webClients = new Set(); // Set of WebSocket connections from dashboards

// Helper: broadcast to all web clients (text)
function broadcastToWebClients(data) {
  const txt = JSON.stringify(data);
  for (const client of webClients) {
    if (client.readyState === WebSocket.OPEN) client.send(txt);
  }
}

// WebSocket handler (single server, we route by pathname)
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/ws/devices') {
    // Web dashboard client
    console.log('Web dashboard connected');
    webClients.add(ws);

    // send current device list
    const deviceList = Array.from(devices.values()).map(d => ({
      deviceId: d.deviceId, name: d.name, firmwareVersion: d.firmwareVersion,
      capabilities: d.capabilities, publicIp: d.publicIp,
      lastSeen: d.lastSeen, status: d.status, samplingRate: d.samplingRate,
      cameraResolution: d.cameraResolution, compressionEnabled: d.compressionEnabled,
      otaEnabled: d.otaEnabled
    }));
    ws.send(JSON.stringify({ type: 'devices_list', devices: deviceList }));

    ws.on('message', (msg) => {
      // We expect JSON text messages from the dashboard
      try {
        const data = JSON.parse(msg);
        // 1) Send binary to device: { type: 'binary_cmd', target: '<deviceId>', payloadHex: '0A01' }
        if (data.type === 'binary_cmd' && data.target && data.payloadHex) {
          const device = devices.get(data.target);
          if (!device || !device.ws || device.ws.readyState !== WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'Device not connected' }));
            return;
          }
          // parse hex string -> Buffer
          let hex = data.payloadHex.replace(/[^0-9a-fA-F]/g, '');
          if (hex.length % 2 !== 0) hex = '0' + hex; // pad if odd
          const buf = Buffer.from(hex, 'hex');
          device.ws.send(buf);
          ws.send(JSON.stringify({ type: 'binary_sent', target: data.target, bytes: buf.length }));
          return;
        }

        // 2) High-level relay (optional): { type: 'relay', target, message }
        if (data.type === 'relay' && data.target && data.message) {
          const device = devices.get(data.target);
          if (device && device.ws && device.ws.readyState === WebSocket.OPEN) {
            device.ws.send(JSON.stringify(data.message));
            ws.send(JSON.stringify({ type: 'relayed', target: data.target }));
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Device not connected' }));
          }
          return;
        }

        // 3) other dashboard messages you might add...
      } catch (err) {
        console.error('Invalid dashboard message', err);
      }
    });

    ws.on('close', () => {
      webClients.delete(ws);
      console.log('Web dashboard disconnected');
    });

    ws.on('error', (err) => {
      console.error('Web dashboard ws error:', err);
    });

  } else if (path === '/ws/esp32') {
    // ESP32 device connection
    console.log('ESP32 attempting to connect...');
    let deviceId = null;

    ws.on('message', (message) => {
      // message may be Buffer (binary) or string (text)
      if (typeof message === 'string') {
        try {
          const data = JSON.parse(message);
          // registration
          if (data.type === 'register') {
            deviceId = data.deviceId || uuidv4();
            const deviceInfo = {
              deviceId,
              name: data.name || `ESP-${deviceId.slice(0, 8)}`,
              firmwareVersion: data.firmwareVersion || '1.0.0',
              capabilities: data.capabilities || [],
              publicIp: req.socket.remoteAddress,
              lastSeen: new Date().toISOString(),
              status: 'online',
              samplingRate: data.samplingRate || 1000,
              cameraResolution: data.cameraResolution,
              compressionEnabled: data.compressionEnabled,
              otaEnabled: data.otaEnabled,
              ws
            };
            devices.set(deviceId, deviceInfo);
            console.log(`Device registered: ${deviceId}`);

            // ack to device
            ws.send(JSON.stringify({ type: 'registration_ack', deviceId, status: 'success' }));

            // notify dashboards
            broadcastToWebClients({ type: 'device_registered', device: deviceInfo });
            return;
          } else if (data.type === 'heartbeat') {
            if (deviceId && devices.has(deviceId)) {
              const d = devices.get(deviceId);
              d.lastSeen = new Date().toISOString();
              devices.set(deviceId, d);
              // optionally notify dashboards with heartbeat
              broadcastToWebClients({ type: 'device_heartbeat', deviceId, lastSeen: d.lastSeen });
            }
            return;
          } else if (data.type === 'sensor_frame') {
            // sensor_frame text (if device sends as JSON instead of binary)
            broadcastToWebClients({ type: 'sensor_frame', deviceId, frame: data });
            return;
          } else if (data.type === 'ai_log') {
            broadcastToWebClients({ type: 'ai_log', deviceId, event: data.event });
            return;
          } else {
            // other text messages
            broadcastToWebClients({ type: 'device_message', deviceId, payload: data });
            return;
          }
        } catch (err) {
          console.error('Error parsing text message from device', err);
          return;
        }
      } else if (Buffer.isBuffer(message)) {
        // binary frames: could be sensor data or other binary protocols
        const hex = message.toString('hex');
        // broadcast to dashboards with tag that binary was received
        broadcastToWebClients({ type: 'device_binary', deviceId, hex, length: message.length });
        // Also store/process in handleSensorFrame if you want:
        console.log(`Received binary (${message.length}) from ${deviceId}: ${hex.slice(0, 80)}${hex.length > 80 ? '...' : ''}`);
        return;
      }
    });

    ws.on('close', () => {
      if (deviceId) {
        console.log(`Device disconnected: ${deviceId}`);
        devices.delete(deviceId);
        broadcastToWebClients({ type: 'device_disconnected', deviceId });
      }
    });

    ws.on('error', (err) => {
      console.error('ESP32 WebSocket error:', err);
    });

  } else {
    // Unknown path — close politely
    console.log('Unknown WS path:', path);
    ws.close();
  }
});

// REST endpoints (kept from your original server)
app.get('/api/devices', (req, res) => {
  const deviceList = Array.from(devices.values()).map(d => ({
    deviceId: d.deviceId,
    name: d.name,
    firmwareVersion: d.firmwareVersion,
    capabilities: d.capabilities,
    publicIp: d.publicIp,
    lastSeen: d.lastSeen,
    status: d.status,
    samplingRate: d.samplingRate,
    cameraResolution: d.cameraResolution,
    compressionEnabled: d.compressionEnabled,
    otaEnabled: d.otaEnabled
  }));
  res.json({ devices: deviceList });
});

// Update device configuration (kept)
app.put('/api/devices/:deviceId/configure', (req, res) => {
  const { deviceId } = req.params;
  const config = req.body;
  if (!devices.has(deviceId)) return res.status(404).json({ error: 'Device not found' });

  const device = devices.get(deviceId);
  device.name = config.deviceName || device.name;
  device.samplingRate = config.samplingRate || device.samplingRate;
  device.capabilities = config.capabilities || device.capabilities;
  device.cameraResolution = config.cameraResolution;
  device.compressionEnabled = config.compressionEnabled;
  device.otaEnabled = config.otaEnabled;
  devices.set(deviceId, device);

  // send config update to device
  if (device.ws && device.ws.readyState === WebSocket.OPEN) {
    device.ws.send(JSON.stringify({
      type: 'config_update',
      config: {
        deviceName: device.name,
        samplingRate: device.samplingRate,
        capabilities: device.capabilities,
        cameraResolution: device.cameraResolution,
        compressionEnabled: device.compressionEnabled,
        otaEnabled: device.otaEnabled
      }
    }));
  }

  res.json({ success: true, device: { deviceId: device.deviceId, name: device.name, capabilities: device.capabilities }});
});

// Send binary command via REST (optional): payloadHex string
app.post('/api/devices/:deviceId/send-binary', (req, res) => {
  const { deviceId } = req.params;
  const { payloadHex } = req.body;
  if (!devices.has(deviceId)) return res.status(404).json({ error: 'Device not found' });
  const device = devices.get(deviceId);
  if (!device.ws || device.ws.readyState !== WebSocket.OPEN) return res.status(503).json({ error: 'Device offline' });

  try {
    let hex = (payloadHex || '').replace(/[^0-9a-fA-F]/g, '');
    if (hex.length % 2 !== 0) hex = '0' + hex;
    const buf = Buffer.from(hex, 'hex');
    device.ws.send(buf);
    return res.json({ success: true, sentBytes: buf.length });
  } catch (err) {
    console.error('Error sending binary via REST', err);
    return res.status(400).json({ error: 'Invalid payloadHex' });
  }
});

// health route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedDevices: devices.size,
    webClients: webClients.size
  });
});

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`WebSocket endpoints:`);
  console.log(` - ws://<your-lan-ip>:${PORT}/ws/esp32 (for ESP32 devices)`);
  console.log(` - ws://<your-lan-ip>:${PORT}/ws/devices (for web dashboards)`);
});
