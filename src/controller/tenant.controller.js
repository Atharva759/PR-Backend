import { db, admin } from "../config/firebase.js";

export async function inviteTenantAdmin(req, res) {
  try {
    const { email, tenantId } = req.body;

    // check super_admin
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    //  Create user
    const user = await admin.auth().createUser({
      email,
      emailVerified: false
    });

    //  Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      role: "tenant_admin",
      tenantId
    });

    res.json({
      message: "Tenant admin created successfully",
      email
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


export async function getTenantDevices(req, res) {
  try {

    const { tenantId } = req.params;

    const snapshot = await admin
      .database()
      .ref("/devices_registry")
      .once("value");

    const devices = snapshot.val() || {};

    const tenantDevices = Object.entries(devices)
      .filter(([id, device]) => device.tenantId === tenantId)
      .map(([id, device]) => ({
        deviceId: id,
        ...device
      }));

    res.json(tenantDevices);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tenant devices" });
  }
};



/* ASSIGN DEVICE TO TENANT */

export async function assignDeviceToTenant(req, res) {

  try {

    const { tenantId } = req.params;
    const { deviceId } = req.body;

    await admin
      .database()
      .ref(`/devices_registry/${deviceId}`)
      .update({
        tenantId
      });

    res.json({ message: "Device assigned to tenant" });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Failed to assign device" });

  }

};



/* REMOVE DEVICE FROM TENANT */

export const removeDeviceFromTenant = async (req, res) => {

  try {

    const { deviceId } = req.params;

    await admin
      .database()
      .ref(`/devices_registry/${deviceId}`)
      .update({
        tenantId: null
      });

    res.json({ message: "Device removed from tenant" });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Failed to remove device" });

  }

};

// Frontend call - sendPasswordResetEmail(auth, email) 

// ==========================================
// GET ALL TENANTS
// ==========================================
export async function getAllTenants(req, res) {

  try {

    const snapshot = await db.ref("tenants").once("value");

    if (!snapshot.exists()) {

      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });

    }

    const tenantsObj = snapshot.val();

    const tenants = Object.entries(tenantsObj).map(
      ([id, value]) => ({
        id,
        ...value
      })
    );

    res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

}



// ==========================================
// GET SINGLE TENANT
// ==========================================
export async function getTenantById(req, res) {

  try {

    const { tenantId } = req.params;

    const snapshot = await db
      .ref(`tenants/${tenantId}`)
      .once("value");

    if (!snapshot.exists()) {

      return res.status(404).json({
        message: "Tenant not found"
      });

    }

    res.json(snapshot.val());

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });

  }

}
// ==========================================
// UPDATE TENANT
// ==========================================
export async function updateTenant(req, res) {

  try {

    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        message: "Forbidden"
      });
    }

    const { tenantId } = req.params;

    const { name, sensors } = req.body;

    const ref = db.ref(`tenants/${tenantId}`);

    const snapshot = await ref.once("value");

    if (!snapshot.exists()) {

      return res.status(404).json({
        message: "Tenant not found"
      });

    }

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (sensors !== undefined) updateData.sensors = sensors;

    await ref.update(updateData);

    res.json({
      message: "Tenant updated successfully"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });

  }

}



// ==========================================
// DELETE TENANT
// ==========================================
export async function deleteTenant(req, res) {

  try {

    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        message: "Forbidden"
      });
    }

    const { tenantId } = req.params;

    const ref = db.ref(`tenants/${tenantId}`);

    const snapshot = await ref.once("value");

    if (!snapshot.exists()) {

      return res.status(404).json({
        message: "Tenant not found"
      });

    }

    await ref.remove();

    res.json({
      message: "Tenant deleted successfully"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });

  }

}