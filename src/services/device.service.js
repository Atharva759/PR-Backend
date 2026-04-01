import { db } from "../config/firebase.js";
import {v4 as uuidv4} from "uuid";

export async function getDeviceByMac(mac) {
  const snapshot = await db.ref("devices_registry")
    .orderByChild("mac")
    .equalTo(mac)
    .once("value");

  if (!snapshot.exists()) return null;

  const data = snapshot.val();
  const key = Object.keys(data)[0];

  return { id: key, ...data[key] };
}

// NEW FACILITY FUNCTIONS
export const addDevice = async (user, body) => {
  const id = uuidv4();

  const device = {
    id,
    name: body.name,
    macId: body.macId,
    tenantId: user.tenantId,
    facilityId: user.facilityId,
    addedBy: user.uid,
    createdAt: Date.now()
  };

  await db.ref(`devices_registry/${id}`).set(device);

  return device;
};

export const getDevices = async (user) => {
  const snap = await db.ref("devices_registry").once("value");
  const data = snap.val() || {};

  let devices = Object.values(data);

  if (user.role === "tenant_admin") {
    return devices.filter(d => d.tenantId === user.tenantId);
  }

  if (user.role === "facility_admin" || user.role === "facility_user") {
    return devices.filter(d => d.facilityId === user.facilityId);
  }

  return [];
};