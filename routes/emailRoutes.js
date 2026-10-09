import express from "express";
import { sendMessage,deleteUserAccount } from "../controllers/emailController.js";

const router = express.Router();

router.post("/send-message", sendMessage);
router.delete("/delete-account/:userId", deleteUserAccount);

export default router;
