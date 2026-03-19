
import { db ,admin} from "../config/firebase.js";


// GET ALL USERS (SUPER ADMIN)
export async function getAllUsers(req, res) {
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
export async function getUsersByTenant(req, res) {
  try {
    
    if (req.user.role !== "super_admin" && req.user.role!=="tenant_admin") {
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
export async function updateUserRole(req, res) {
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
export async function updateUserEmail(req, res) {
  try {

    if (req.user.role !== "super_admin" && req.user.role!=="tenant_admin") {
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
export async function deleteUser(req, res) {
  try {

    if (req.user.role !== "super_admin" && req.user.role!=="tenant_admin") {
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

export async function setRoles(req,res){
  try {
      const { uid } = req.body;
      const snapshot = await db
        .ref(`/users/${uid}`)
        .once("value");
  
      const userData = snapshot.val();
  
      if (!userData) {
        return res.status(404).json({ error: "User not found" });
      }
  
      const { role, tenantId } = userData;
  
      await admin.auth().setCustomUserClaims(uid, {
        role,
        tenantId,
      });
  
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to set claims" });
    }
}



/*
GET /api/users	List all users
GET /api/users/:tenantId	List users by tenant
PATCH /api/users/:uid/role	Change role
PATCH /api/users/:uid/email	Update email
DELETE /api/users/:uid	Delete user
*/