require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const { handleESPMessage } = require("./websocket/device.socket");
const deviceRoutes = require("./routes/device.routes");
const tenantRoutes = require("./routes/tenant.routes");
const userRoutes = require("./routes/user.routes");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

app.use("/api/devices", deviceRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/users", userRoutes);

handleESPMessage(wss);

server.listen(process.env.PORT || 8080, () => {
  console.log("Server running on port 8080...");
});