// Backend Server for ESP32 Device Management
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

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/ws/devices') {
    // Web client connection for monitoring devices
    console.log('Web client connected');
    webClients.add(ws);

    // Send current device list to newly connected client
    ws.send(JSON.stringify({
      type: 'devices_list',
      devices: Array.from(devices.values())
    }));

    ws.on('close', () => {
      console.log('Web client disconnected');
      webClients.delete(ws);
    });
  } else if (path === '/ws/esp32') {
    // ESP32 device connection
    let deviceId = null;
    let deviceInfo = null;

    console.log('ESP32 attempting to connect...');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // Handle device registration
        if (data.type === 'register') {
        deviceId = data.deviceId || uuidv4();
        deviceInfo = {
          deviceId,
          name: data.name || `ESP32-${deviceId.slice(0, 8)}`,
          firmwareVersion: data.firmwareVersion || '1.0.0',
          capabilities: data.capabilities || [],
          publicIp: req.socket.remoteAddress,
          lastSeen: new Date().toISOString(),
          status: 'online',
          samplingRate: data.samplingRate || 1000,
          cameraResolution: data.cameraResolution,
          compressionEnabled: data.compressionEnabled,
          otaEnabled: data.otaEnabled
        };

        devices.set(deviceId, { ...deviceInfo, ws });
        console.log(`Device registered: ${deviceId}`);

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


        // Handle heartbeat/status updates
        else if (data.type === 'heartbeat') {
          if (deviceId && devices.has(deviceId)) {
            const device = devices.get(deviceId);
            device.lastSeen = new Date().toISOString();
            devices.set(deviceId, device);
          }
        }

        // Handle sensor data frames (for active sessions)
        else if (data.type === 'sensor_frame') {
          console.log(`Received sensor frame from ${deviceId}`);
          // Process and store frame data
          // In production, this would go to object storage (S3)
          handleSensorFrame(deviceId, data);
        }

        // Handle AI log events
        else if (data.type === 'ai_log') {
          console.log(`AI event from ${deviceId}:`, data.event);
          handleAILog(deviceId, data);
        }
      } catch (error) {
        console.error('Error processing ESP32 message:', error);
      }
    });

    ws.on('close', () => {
      if (deviceId) {
        console.log(`Device disconnected: ${deviceId}`);
        devices.delete(deviceId);

        // Notify web clients about device disconnect
        broadcastToWebClients({
          type: 'device_disconnected',
          deviceId
        });
      }
    });

    ws.on('error', (error) => {
      console.error('ESP32 WebSocket error:', error);
    });
  }
});

// Helper function to broadcast to web clients
function broadcastToWebClients(data) {
  const message = JSON.stringify(data);
  webClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Handle sensor frame data
function handleSensorFrame(deviceId, data) {
  // In production: 
  // 1. Validate frame checksum
  // 2. Store to object storage (S3/MinIO)
  // 3. Update frame registry in database
  // 4. Check for missing frames and mark in retransmit queue
  console.log(`Storing frame ${data.frameId} from ${deviceId}`);
}

// Handle AI log events
function handleAILog(deviceId, data) {
  // Store AI logs to database
  console.log(`AI Log: Device ${deviceId} - Event: ${data.event}`);
}

// REST API Endpoints

// Get all devices for a user
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

// Register/update device (called by ESP32 or portal)
app.post('/api/devices/:deviceId/register', (req, res) => {
  const { deviceId } = req.params;
  const deviceData = req.body;

  if (devices.has(deviceId)) {
    const device = devices.get(deviceId);
    Object.assign(device, deviceData);
    devices.set(deviceId, device);
  } else {
    devices.set(deviceId, {
      ...deviceData,
      deviceId,
      lastSeen: new Date().toISOString(),
      status: 'offline'
    });
  }

  res.json({ success: true, deviceId });
});

// Update device configuration
app.put('/api/devices/:deviceId/configure', (req, res) => {
  const { deviceId } = req.params;
  const config = req.body;

  if (!devices.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const device = devices.get(deviceId);
  
  // Update device configuration
  device.name = config.deviceName || device.name;
  device.samplingRate = config.samplingRate || device.samplingRate;
  device.capabilities = config.capabilities || device.capabilities;
  device.cameraResolution = config.cameraResolution;
  device.compressionEnabled = config.compressionEnabled;
  device.otaEnabled = config.otaEnabled;

  devices.set(deviceId, device);

  // Send configuration update to ESP32 via WebSocket
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

  res.json({ success: true, device: {
    deviceId: device.deviceId,
    name: device.name,
    capabilities: device.capabilities
  }});
});

// Get device capabilities
app.put('/api/devices/:deviceId/capabilities', (req, res) => {
  const { deviceId } = req.params;
  const { capabilities } = req.body;

  if (!devices.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const device = devices.get(deviceId);
  device.capabilities = capabilities;
  devices.set(deviceId, device);

  res.json({ success: true });
});

// Create new session
app.post('/api/sessions', (req, res) => {
  const { name, nodes, sensors, keySetId, duration, retentionPolicy } = req.body;
  
  const sessionId = uuidv4();
  const session = {
    sessionId,
    name,
    nodes,
    sensors,
    keySetId,
    startTime: new Date().toISOString(),
    duration,
    retentionPolicy,
    status: 'active',
    sessionToken: uuidv4()
  };

  sessions.set(sessionId, session);

  // Notify selected ESP32 nodes about new session
  nodes.forEach(nodeId => {
    if (devices.has(nodeId)) {
      const device = devices.get(nodeId);
      if (device.ws && device.ws.readyState === WebSocket.OPEN) {
        device.ws.send(JSON.stringify({
          type: 'session_start',
          sessionId,
          sessionToken: session.sessionToken,
          sensors,
          duration
        }));
      }
    }
  });

  res.json({ success: true, session });
});

// Get session details
app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ session: sessions.get(sessionId) });
});

// Start session
app.post('/api/sessions/:sessionId/start', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessions.get(sessionId);
  session.status = 'active';
  session.startTime = new Date().toISOString();
  sessions.set(sessionId, session);

  res.json({ success: true, session });
});

// Stop session
app.post('/api/sessions/:sessionId/stop', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessions.get(sessionId);
  session.status = 'stopped';
  session.endTime = new Date().toISOString();
  sessions.set(sessionId, session);

  // Notify ESP32 nodes to stop acquisition
  session.nodes.forEach(nodeId => {
    if (devices.has(nodeId)) {
      const device = devices.get(nodeId);
      if (device.ws && device.ws.readyState === WebSocket.OPEN) {
        device.ws.send(JSON.stringify({
          type: 'session_stop',
          sessionId
        }));
      }
    }
  });

  res.json({ success: true, session });
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  const sessionList = Array.from(sessions.values());
  res.json({ sessions: sessionList });
});

// Upload public keys for PUF encryption
app.post('/api/users/:userId/keysets', (req, res) => {
  const { userId } = req.params;
  const { publicKeys } = req.body;
  
  const keySetId = uuidv4();
  // In production: store in database
  console.log(`Registered key set ${keySetId} for user ${userId}`);
  
  res.json({ success: true, keySetId, keysCount: publicKeys.length });
});

// Get keyset info
app.get('/api/keysets/:keySetId', (req, res) => {
  const { keySetId } = req.params;
  // In production: fetch from database
  res.json({ keySetId, status: 'active' });
});

// Get frames for a session
app.get('/api/sessions/:sessionId/frames', (req, res) => {
  const { sessionId } = req.params;
  const { node, sensor, from, to } = req.query;
  
  // In production: query object storage (S3) for frames
  // Filter by node, sensor, time range
  res.json({
    frames: [],
    message: 'Frame retrieval not yet implemented'
  });
});

// Request frame download
app.post('/api/sessions/:sessionId/download-request', (req, res) => {
  const { sessionId } = req.params;
  const { frameIds, timeRange } = req.body;
  
  // In production: generate pre-signed URLs for S3 objects
  const downloadUrls = frameIds?.map(id => ({
    frameId: id,
    url: `https://storage.example.com/frames/${id}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  })) || [];
  
  res.json({ downloadUrls });
});

// Send actuator command
app.post('/api/nodes/:nodeId/actuators/:actuatorId/command', (req, res) => {
  const { nodeId, actuatorId } = req.params;
  const { value, nonce } = req.body;
  
  if (!devices.has(nodeId)) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const device = devices.get(nodeId);
  const commandId = uuidv4();
  
  if (device.ws && device.ws.readyState === WebSocket.OPEN) {
    device.ws.send(JSON.stringify({
      type: 'actuator_command',
      commandId,
      actuatorId,
      value,
      nonce
    }));
    
    res.json({ 
      success: true, 
      commandId,
      status: 'sent',
      message: 'Command sent to device'
    });
  } else {
    res.status(503).json({ 
      error: 'Device offline',
      message: 'Cannot send command to offline device'
    });
  }
});

// Get actuator status
app.get('/api/nodes/:nodeId/actuators/:actuatorId/status', (req, res) => {
  const { nodeId, actuatorId } = req.params;
  
  // In production: fetch from database
  res.json({
    actuatorId,
    nodeId,
    lastCommand: null,
    status: 'unknown'
  });
});

// Get user activity logs
app.get('/api/users/:userId/activity', (req, res) => {
  const { userId } = req.params;
  const { from, to } = req.query;
  
  // In production: query activity log database
  res.json({
    activities: [],
    message: 'Activity log retrieval not yet implemented'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedDevices: devices.size,
    activeSessions: sessions.size,
    webClients: webClients.size
  });
});

// Start server
const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0"; // 👈 allow all network interfaces

server.listen(PORT, HOST, () => {
  console.log(`✓ Server running on http://${HOST}:${PORT}`);
  console.log(`✓ WebSocket endpoints:`);
  console.log(`  - ws://<your-lan-ip>:${PORT}/ws/esp32 (for ESP32 devices)`);
  console.log(`  - ws://<your-lan-ip>:${PORT}/ws/devices (for web clients)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});