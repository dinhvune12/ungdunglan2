import express from "express";

import {
  sendDirectMessage,
  sendGroupMessage,
  uploadMessageImage,
  sendPublicMessage,
} from "../controllers/messageController.js";
import {
  checkFriendship,
  checkGroupMembership,
} from "../middlewares/friendMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import { checkPublicToken } from "../middlewares/publicTokenMiddleware.js";

const router = express.Router();

router.post("/direct", checkFriendship, sendDirectMessage);
router.post("/group", checkGroupMembership, sendGroupMessage);
router.post("/upload", upload.single("file"), uploadMessageImage);
router.post("/send-public", checkPublicToken, sendPublicMessage);

export default router;
