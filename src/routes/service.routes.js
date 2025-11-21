import { Router } from "express";
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/services.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getServices);
router.get("/:serviceId", getServiceById);

// Protected routes (Admin only)
router.post("/", verifyJWT, createService);
router.put("/:serviceId", verifyJWT, updateService);
router.delete("/:serviceId", verifyJWT, deleteService);

export default router;
