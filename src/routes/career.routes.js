import { Router } from "express";
import {
  createJobPosting,
  getJobPostings,
  getJobPostingById,
  updateJobPosting,
  deleteJobPosting,
} from "../controllers/career.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getJobPostings);
router.get("/:careerId", getJobPostingById);

// Protected routes (Admin only)
router.post("/", verifyJWT, createJobPosting);
router.put("/:careerId", verifyJWT, updateJobPosting);
router.delete("/:careerId", verifyJWT, deleteJobPosting);

export default router;
