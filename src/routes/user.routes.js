import express from "express";
const router = express.Router();
import requireRole from "../middleware/rbac.middleware.js";
import {verifyToken} from "../middleware/auth.middleware.js";

import {
  getAllUsers,
  getUsersByTenant,
  updateUserRole,
  updateUserEmail,
  deleteUser,
  setRoles,
  createSuperAdmin,
  createTenantAdmin
} from "../controller/user.controller.js";

router.post("/auth/setClaims",setRoles)

router.get("/", verifyToken, getAllUsers);

router.get("/tenant/:tenantId", verifyToken, getUsersByTenant);

router.patch("/:uid/role", verifyToken, updateUserRole);

router.patch("/:uid/email", verifyToken, updateUserEmail);

router.delete("/:uid", verifyToken, deleteUser);

router.post("/create-super-admin", createSuperAdmin);

router.post("/create-tenant-admin", createTenantAdmin);


/*
GET /api/users	List all users
GET /api/users/:tenantId	List users by tenant
PATCH /api/users/:uid/role	Change role
PATCH /api/users/:uid/email	Update email
DELETE /api/users/:uid	Delete user
*/

// NEW FACILITY
import {assignFacilityRole} from "../controller/user.controller.js";
router.post("/assign-role", verifyToken, requireRole("tenant_admin"), assignFacilityRole);



export default router;