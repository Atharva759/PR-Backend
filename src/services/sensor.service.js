const { db } = require("../config/firebase");

async function insertSensorData(tenantId, sensorType, mac, data) {

  const timestamp = Date.now();

  const ref = db.ref(
    `tenants/${tenantId}/${sensorType}/${mac}/${timestamp}`
  );

  await ref.set(data);
}

module.exports = { insertSensorData };