import { Router } from "express";
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
} from "../controllers/contact.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// Public route - anyone can submit a contact form
router.post("/", createContact);

// Protected routes (Admin only)
router.get("/all", verifyJWT, getContacts);
router.get("/:contactId", verifyJWT, getContactById);
router.put("/:contactId", verifyJWT, updateContact);
router.delete("/:contactId", verifyJWT, deleteContact);

export default router;
