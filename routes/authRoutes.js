import express from 'express';
import {
  sendOtp,
  verifyOtp,
  completeRegistration,
  getProfile,
} from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);


router.post('/register', upload.single('aadharImage'), completeRegistration);

router.get('/profile', protect, getProfile);

export default router;