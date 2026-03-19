import { getDeviceByMac } from"../services/device.service.js";
import { insertSensorData } from "../services/sensor.service.js";

export async function handleESPMessage(wss) {

  wss.on("connection", (ws, req) => {

    
    if (req.url !== "/ws/esp32") {
      ws.close();
      return;
    }

    console.log("ESP connected");

    ws.on("message", async (message) => {
      try {
        const payload = JSON.parse(message);
        const mac = payload.mac;

        const device = await getDeviceByMac(mac);

        if (!device) {
          console.log("Device not registered:", mac);
          return;
        }

        const tenantId = device.tenantId;

        for (const sensor of payload.sensors) {
          const sensorType = sensor.type;
          const sensorData = sensor.data;

          await insertSensorData(
            tenantId,
            sensorType,
            mac,
            sensorData
          );
        }

        console.log("Data inserted successfully");

      } catch (err) {
        console.error("WebSocket error:", err.message);
      }
    });

    ws.on("close", () => {
      console.log("ESP disconnected");
    });
  });
}

export default handleESPMessage;