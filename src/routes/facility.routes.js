import express from "express";
import {verifyToken} from "../middleware/auth.middleware.js";
import requireRole from "../middleware/rbac.middleware.js";
import {createFacility,getFacilities} from "../controller/facility.controller.js";

const router = express.Router();

router.post("/",verifyToken,requireRole("tenant_admin"),createFacility);
router.get("/",verifyToken,getFacilities);

export default router;