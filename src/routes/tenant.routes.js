import express from "express";
import {verifyToken} from"../middleware/auth.middleware.js";
import requireRole from"../middleware/rbac.middleware.js";
import { db } from "../config/firebase.js";
import { inviteTenantAdmin,updateTenant,deleteTenant,getTenantDevices,removeDeviceFromTenant,assignDeviceToTenant } from "../controller/tenant.controller.js";

const router = express.Router();
// Create a new tenant
router.post(
  "/create",
  verifyToken,
  requireRole(["super_admin"]),
  async (req, res) => {

    const ref = db.ref("tenants").push();

    await ref.set({
      name: req.body.name,
      createdAt: Date.now()
    });

    res.json({ tenantId: ref.key });
  }
);

router.patch(
  "/:tenantId",
  verifyToken,
  requireRole(["super_admin"]),
  updateTenant
);

router.delete(
  "/:tenantId",
  verifyToken,
  requireRole(["super_admin"]),
  deleteTenant
);

router.get("/:tenantId/devices", verifyToken, getTenantDevices);

router.post("/:tenantId/devices/assign", verifyToken, assignDeviceToTenant);

router.delete("/:tenantId/devices/:deviceId", verifyToken, removeDeviceFromTenant);

// Invite Tenant Admin Through Super Admin (FrontEnd - /api/tenants/invite-admin (pass parameters accordingly))
router.post("/invite-admin", verifyToken, inviteTenantAdmin);

export default router;