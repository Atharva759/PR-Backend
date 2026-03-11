const { db } = require("../config/firebase");

async function getDeviceSensorData(req, res) {
  try {
    const { mac, sensorType } = req.params;
    const tenantId = req.user.tenantId;

    const snapshot = await db.ref(
      `tenants/${tenantId}/${sensorType}/${mac}`
    )
    .limitToLast(50) // last 50 readings
    .once("value");

    if (!snapshot.exists()) {
      return res.json([]);
    }

    res.json(snapshot.val());

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getDeviceSensorData };