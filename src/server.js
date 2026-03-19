import express from "express";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import http from "http";
import {WebSocketServer} from "ws";
import cors from "cors";
import path from "path"

import { handleESPMessage } from "./websocket/device.socket.js";
import deviceRoutes from"./routes/device.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import userRoutes from"./routes/user.routes.js";
import monitorRoutes from "./routes/monitor.routes.js";


const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });


app.use(cors());
app.use(express.json());

app.use("/api/devices", deviceRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/users", userRoutes);
app.use("/api/monitor", monitorRoutes);
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});


handleESPMessage(wss);

server.listen(process.env.PORT || 8080, () => {
  console.log("Server running on port 8080...");
});