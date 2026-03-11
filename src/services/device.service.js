const { db } = require("../config/firebase");

async function getDeviceByMac(mac) {
  const snapshot = await db.ref("devices_registry")
    .orderByChild("mac")
    .equalTo(mac)
    .once("value");

  if (!snapshot.exists()) return null;

  const data = snapshot.val();
  const key = Object.keys(data)[0];

  return { id: key, ...data[key] };
}

module.exports = { getDeviceByMac };