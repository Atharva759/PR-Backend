import { db } from "../config/firebase.js";
export async function insertSensorData(tenantId, sensorType, mac, data) {

  const timestamp = Date.now();

  const ref = db.ref(
    `tenants/${tenantId}/${sensorType}/${mac}/${timestamp}`
  );

  await ref.set(data);
}

