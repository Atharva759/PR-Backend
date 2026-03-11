const admin = require("firebase-admin");

async function inviteTenantAdmin(req, res) {
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

module.exports = {inviteTenantAdmin};
// Frontend call - sendPasswordResetEmail(auth, email) 