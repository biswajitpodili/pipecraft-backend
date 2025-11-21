import { Router } from "express";
import {
  createUser,
  deleteUser,
  generateRefreshAuthToken,
  getUserProfile,
  listUsers,
  loginUser,
  logoutUser,
  updateUserProfile,
  changePassword,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", upload.single("avatar"), createUser);
router.post("/login", loginUser);
router.get("/refresh-token", generateRefreshAuthToken);

router.get("/me", verifyJWT, getUserProfile);
router.get("/logout", verifyJWT, logoutUser);
router.post("/change-password", verifyJWT, changePassword);
router.get("/users", verifyJWT, listUsers);
router.put("/users/:userId", verifyJWT, upload.single("avatar"), updateUserProfile);
router.delete("/users/:userId", verifyJWT, deleteUser);

export default router;
