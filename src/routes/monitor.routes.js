import express from "express";
const router = express.Router();

import {verifyToken} from "../middleware/auth.middleware.js";

import {
  backendHealth,
  frontendHealth,
  getDevicesCount,
  getTenantsCount,
  getSystemStats
} from "../controller/monitor.controller.js";


router.get("/health", backendHealth);

router.get("/frontend", frontendHealth);

router.get("/devices-count", verifyToken, getDevicesCount);

router.get("/tenants-count", verifyToken, getTenantsCount);

router.get("/stats", verifyToken, getSystemStats);

export default router;

/*
API	Purpose
GET /api/monitor/health	Backend status
GET /api/monitor/stats	System statistics
GET /api/monitor/frontend	Frontend status
GET /api/monitor/devices-count	Total devices
GET /api/monitor/tenants-count	Total tenants
*/