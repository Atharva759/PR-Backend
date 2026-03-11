const express = require("express");
const verifyToken = require("../middleware/auth.middleware");
const requireRole = require("../middleware/rbac.middleware");
const { db } = require("../config/firebase");
const { getDeviceSensorData } = require("../controller/sensor.controller");

const router = express.Router();

// Tenant Admin registers device
router.post(
  "/register",
  verifyToken,
  requireRole(["tenant_admin"]),
  async (req, res) => {

    const { mac, name } = req.body;
    const tenantId = req.user.tenantId;
    

    const ref = db.ref("devices_registry").push();

    await ref.set({
      mac,
      name,
      tenantId
    });

    res.json({ success: true });
  }
);

const {
  getAllDevices,
  getTenantDevices,
  getDeviceById,
  updateDevice,
  deleteDevice
} = require("../controller/device.controller");


router.get("/", verifyToken, getAllDevices);


router.get("/:deviceId", verifyToken, getDeviceById);

router.patch("/:deviceId", verifyToken, updateDevice);

router.delete("/:deviceId", verifyToken, deleteDevice);

// Get Tenant Devices (Frontend - GET /api/devices -- Authorization: Bearer <idToken>)
router.get("/", verifyToken, getTenantDevices);
// Get Sensor Data (Frontend - GET /api/devices/pzem/AA:BB:CC:DD:EE:FF --Authorization: Bearer <idToken>)
router.get("/:sensorType/:mac", verifyToken, getDeviceSensorData);

/*
GET /api/devices	Get all devices (super_admin)
GET /api/devices/tenant	Get devices of logged-in tenant
GET /api/devices/:deviceId	Get single device
PATCH /api/devices/:deviceId	Update device name
DELETE /api/devices/:deviceId	Delete device
*/

module.exports = router;