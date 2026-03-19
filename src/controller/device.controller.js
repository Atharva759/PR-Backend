import { db } from "../config/firebase.js";

// GET ALL DEVICES (SUPER ADMIN)
export async function getAllDevices(req, res) {
  try {

    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const snapshot = await db.ref("devices_registry").once("value");

    if (!snapshot.exists()) {
      return res.json([]);
    }

    const devices = Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data
    }));

    res.json(devices);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// GET DEVICES BY TENANT
export async function getTenantDevices(req, res) {
  try {

    const tenantId = req.user.tenantId;

    const snapshot = await db
      .ref("devices_registry")
      .orderByChild("tenantId")
      .equalTo(tenantId)
      .once("value");

    if (!snapshot.exists()) {
      return res.json([]);
    }

    const devices = Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data
    }));

    res.json(devices);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// GET SINGLE DEVICE
export async function getDeviceById(req, res) {
  try {

    const { deviceId } = req.params;

    const snapshot = await db.ref(`devices_registry/${deviceId}`).once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "Device not found" });
    }

    res.json(snapshot.val());

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// UPDATE DEVICE NAME
export async function updateDevice(req, res) {
  try {

    const { deviceId } = req.params;
    const { name } = req.body;

    await db.ref(`devices_registry/${deviceId}/name`).set(name);

    res.json({ message: "Device updated successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// DELETE DEVICE
export async function deleteDevice(req, res) {
  try {

    const { deviceId } = req.params;

    await db.ref(`devices_registry/${deviceId}`).remove();

    res.json({ message: "Device deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

