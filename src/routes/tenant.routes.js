const express = require("express");
const verifyToken = require("../middleware/auth.middleware");
const requireRole = require("../middleware/rbac.middleware");
const { db } = require("../config/firebase");
const { inviteTenantAdmin } = require("../controller/tenant.controller");

const router = express.Router();

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

// Invite Tenant Admin Through Super Admin (FrontEnd - /api/tenants/invite-admin (pass parameters accordingly))
router.post("/invite-admin", verifyToken, inviteTenantAdmin);

module.exports = router;