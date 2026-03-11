const admin = require("firebase-admin");
const { db } = require("../config/firebase");


// GET ALL USERS (SUPER ADMIN)
async function getAllUsers(req, res) {
  try {

    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const snapshot = await db.ref("users").once("value");

    if (!snapshot.exists()) {
      return res.json([]);
    }

    const users = Object.entries(snapshot.val()).map(([uid, data]) => ({
      uid,
      ...data
    }));

    res.json(users);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// GET USERS BY TENANT
async function getUsersByTenant(req, res) {
  try {

    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { tenantId } = req.params;

    const snapshot = await db
      .ref("users")
      .orderByChild("tenantId")
      .equalTo(tenantId)
      .once("value");

    if (!snapshot.exists()) {
      return res.json([]);
    }

    const users = Object.entries(snapshot.val()).map(([uid, data]) => ({
      uid,
      ...data
    }));

    res.json(users);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// CHANGE USER ROLE
async function updateUserRole(req, res) {
  try {

    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { uid } = req.params;
    const { role } = req.body;

    const user = await admin.auth().getUser(uid);

    await admin.auth().setCustomUserClaims(uid, {
      role
    });

    await db.ref(`users/${uid}/role`).set(role);

    res.json({ message: "Role updated successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// UPDATE EMAIL
async function updateUserEmail(req, res) {
  try {

    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { uid } = req.params;
    const { email } = req.body;

    await admin.auth().updateUser(uid, { email });

    await db.ref(`users/${uid}/email`).set(email);

    res.json({ message: "Email updated successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


// DELETE USER
async function deleteUser(req, res) {
  try {

    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { uid } = req.params;

    await admin.auth().deleteUser(uid);

    await db.ref(`users/${uid}`).remove();

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getAllUsers,
  getUsersByTenant,
  updateUserRole,
  updateUserEmail,
  deleteUser
};

/*
GET /api/users	List all users
GET /api/users/:tenantId	List users by tenant
PATCH /api/users/:uid/role	Change role
PATCH /api/users/:uid/email	Update email
DELETE /api/users/:uid	Delete user
*/