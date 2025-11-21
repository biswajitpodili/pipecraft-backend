import { Router } from "express";
import {
  submitApplication,
  getApplications,
  getApplicationById,
  deleteApplication,
  getApplicationsByCareer,
} from "../controllers/application.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// Public route - submit application with resume upload
router.post("/", upload.single("resume"), submitApplication);

// Protected routes (Admin only)
router.get("/", verifyJWT, getApplications);
router.get("/career/:careerId", verifyJWT, getApplicationsByCareer);
router.get("/:applicationId", verifyJWT, getApplicationById);
router.delete("/:applicationId", verifyJWT, deleteApplication);

export default router;
