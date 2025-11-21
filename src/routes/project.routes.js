import { Router } from "express";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/projects.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getProjects);
router.get("/:projectId", getProjectById);

// Protected routes (Admin only)
router.post("/", verifyJWT, upload.single("image"), createProject);
router.put("/:projectId", verifyJWT, upload.single("image"), updateProject);
router.delete("/:projectId", verifyJWT, deleteProject);

export default router;
