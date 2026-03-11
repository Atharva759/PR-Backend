const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const {
  getAllUsers,
  getUsersByTenant,
  updateUserRole,
  updateUserEmail,
  deleteUser
} = require("../controller/user.controller");


router.get("/", verifyToken, getAllUsers);

router.get("/tenant/:tenantId", verifyToken, getUsersByTenant);

router.patch("/:uid/role", verifyToken, updateUserRole);

router.patch("/:uid/email", verifyToken, updateUserEmail);

router.delete("/:uid", verifyToken, deleteUser);

module.exports = router;

/*
GET /api/users	List all users
GET /api/users/:tenantId	List users by tenant
PATCH /api/users/:uid/role	Change role
PATCH /api/users/:uid/email	Update email
DELETE /api/users/:uid	Delete user
*/