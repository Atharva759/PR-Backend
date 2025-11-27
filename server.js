// Backend Server for ESP32 Device Management
// Run with: node server.js
//require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const pool = new Pool({
  connectionString:process.env.DATABASE_URL,
  ssl:{rejectUnauthorized:false}
});

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
    log(' Web client connected');
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
      log(' Web client disconnected');
      webClients.delete(ws);
    });
  }

  // ------------------------
  // ESP32 Device Connection
  // ------------------------
  else if (path === '/ws/esp32') {
    log('ESP32 attempting connection...');
    let deviceId = null;

    ws.on('message', async(msg) => {
      try {
        const data = JSON.parse(msg);

        // -------- Registration Message --------
        if (data.type === 'register') {
          deviceId = data.deviceId || uuidv4();

          const deviceInfo = {
            deviceId,
            name: data.name || `ESP32-${deviceId.slice(0, 8)}`,
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
          log(`Device registered: ${deviceId}`);

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

          // SQL DB 
          const pzemSensor = data.sensors.find(s=>s.id==="pzem004t");
          if(pzemSensor && pzemSensor.data){
            const {voltage_v, current_a,power_w,energy_wh,frequency_hz} = pzemSensor.data;

            try{
              await pool.query(
                  `INSERT INTO pzem_data (voltage,current,power,energy,frequency)
                  VALUES ($1,$2,$3,$4,$5)`,
                  [
                    voltage_v,current_a,power_w,energy_wh,frequency_hz
                  ]
              );
              //log("PZEM Data inserted into DB");
            }catch(err){
              log("DB error",err.message);
            }
          }

          
          broadcastToWebClients({
            type: 'heartbeat',
            deviceId,
            uptime_ms: data.uptime_ms,
            wifi_rssi: data.wifi_rssi,
            sensors: data.sensors,      
            summary: data.summary,
            timestamp: Date.now()
          });
        }

        
        else if (data.type === 'config_update_ack') {
          log(` ${deviceId} acknowledged config update.`);
        }

        
        else if (data.type === 'session_start_ack') {
          log(` ${deviceId} started session: ${data.sessionId}`);
        } else if (data.type === 'ai_log') {
          handleAILog(deviceId, data);
        }

      } catch (err) {
        log('Error parsing ESP32 message:', err.message);
      }
    });

    ws.on('close', () => {
      if (deviceId) {
        console.log(`Device disconnected: ${deviceId}`);
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
      log('ESP32 WebSocket error:', err.message);
    });
  }
});


// Helper Functions

function broadcastToWebClients(data) {
  const msg = JSON.stringify(data);
  webClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
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

// db data
app.get("/api/pzem/latest", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM pzem_data ORDER BY timestamp DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No sensor data found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    log("DB fetch error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/pzem/history", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM pzem_data ORDER BY timestamp ASC`
    );

    res.json({ success: true, history: result.rows });
  } catch (err) {
    log("DB fetch error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/pzem/history/last50", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM pzem_data ORDER BY timestamp DESC LIMIT 50`
    );

    res.json({ success: true, history: result.rows.reverse() });
  } catch (err) {
    log("DB fetch error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logs
let logs = [];

function log(...args) {
  const message = args.join(" ");
  console.log(message);          // still prints normally
  logs.push({ message, time: Date.now() });

  if (logs.length > 500) logs.shift(); // prevent memory overflow
}

app.get("/logs", (req, res) => {
  res.json(logs);
});


// -------------------
// Start Server
// -------------------
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  log(`Backend Server running at http://${HOST}:${PORT}`);
  /*
  log(` WebSocket endpoints:`);
  log(`  - ws://<your-lan-ip>:${PORT}/ws/esp32`);
  log(`  - ws://<your-lan-ip>:${PORT}/ws/devices`);
  */
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log(' SIGTERM received, closing server...');
  server.close(() => {
    log(' Server closed');
    process.exit(0);
  });
});
