import { db } from "../config/firebase.js";

// BACKEND HEALTH CHECK
export async function backendHealth(req, res) {
  try {
    res.json({
      backend: "running",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ backend: "down" });
  }
}


// FRONTEND HEALTH CHECK
export async function frontendHealth(req, res) {
  res.json({
    frontend: "running"
  });
}


// TOTAL DEVICES
export async function getDevicesCount(req, res) {
  try {

    const snapshot = await db.ref("devices_registry").once("value");

    const count = snapshot.exists()
      ? Object.keys(snapshot.val()).length
      : 0;

    res.json({ totalDevices: count });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// TOTAL TENANTS
export async function getTenantsCount(req, res) {
  try {

    const snapshot = await db.ref("tenants").once("value");

    const count = snapshot.exists()
      ? Object.keys(snapshot.val()).length
      : 0;

    res.json({ totalTenants: count });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// SYSTEM STATS
export async function getSystemStats(req, res) {
  try {

    const devicesSnapshot = await db.ref("devices_registry").once("value");
    const tenantsSnapshot = await db.ref("tenants").once("value");
    const usersSnapshot = await db.ref("users").once("value");

    const devices = devicesSnapshot.exists()
      ? Object.keys(devicesSnapshot.val()).length
      : 0;

    const tenants = tenantsSnapshot.exists()
      ? Object.keys(tenantsSnapshot.val()).length
      : 0;

    const users = usersSnapshot.exists()
      ? Object.keys(usersSnapshot.val()).length
      : 0;

    res.json({
      backendStatus: "running",
      frontendStatus: "running",
      totalDevices: devices,
      totalTenants: tenants,
      totalUsers: users,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

