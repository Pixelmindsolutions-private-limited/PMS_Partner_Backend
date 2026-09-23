import express from 'express';
import { adminProtect } from '../middleware/authMiddleware.js';
import { adminLogin, approvePartner } from '../controllers/adminController.js';

const router = express.Router();

router.post('/login', adminLogin);
router.patch('/approve', adminProtect, approvePartner);

export default router;