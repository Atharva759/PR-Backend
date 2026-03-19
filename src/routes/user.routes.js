import express from "express";
const router = express.Router();

import {verifyToken} from "../middleware/auth.middleware.js";

import {
  getAllUsers,
  getUsersByTenant,
  updateUserRole,
  updateUserEmail,
  deleteUser,
  setRoles
} from "../controller/user.controller.js";

router.post("/auth/setClaims",setRoles)

router.get("/", verifyToken, getAllUsers);

router.get("/tenant/:tenantId", verifyToken, getUsersByTenant);

router.patch("/:uid/role", verifyToken, updateUserRole);

router.patch("/:uid/email", verifyToken, updateUserEmail);

router.delete("/:uid", verifyToken, deleteUser);

export default router;

/*
GET /api/users	List all users
GET /api/users/:tenantId	List users by tenant
PATCH /api/users/:uid/role	Change role
PATCH /api/users/:uid/email	Update email
DELETE /api/users/:uid	Delete user
*/