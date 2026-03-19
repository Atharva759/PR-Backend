import { db } from "../config/firebase.js";
export async function getDeviceSensorData(req, res) {
  try {
    const { mac, sensorType } = req.params;
    const tenantId = req.user.tenantId;
    
    const snapshot = await db.ref(
      `tenants/${tenantId}/${sensorType}/${mac}`
    )
    .limitToLast(50) 
    .once("value");

    if (!snapshot.exists()) {
      return res.json([]);
    }
    
    const raw = snapshot.val();
    const data = Object.entries(raw).map(([timestamp,value])=>({
      timestamp: Number(timestamp),
      ...value
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

