import { Router } from "express";
import { pingme } from "../controllers/common.controller.js";

const router = Router();

// Public route - health check
router.get("/pingme", pingme);


export default router;