import express from "express";
import internalKey from "../middlewares/internalKey.js";
import { provisionUser } from "../controllers/internalController.js";

const router = express.Router();

router.post("/users/provision", internalKey, provisionUser);

export default router;
