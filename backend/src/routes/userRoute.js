import express from "express";
import {
  authMe,
  searchUserByUsername,
  uploadAvatar,
  getAllUsers,
} from "../controllers/userController.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import { checkPublicToken } from "../middlewares/publicTokenMiddleware.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/me", protectedRoute, authMe);
router.get("/search", protectedRoute, searchUserByUsername);
router.get("/all", checkPublicToken, getAllUsers);
router.post("/uploadAvatar", protectedRoute, upload.single("file"), uploadAvatar);

export default router;
