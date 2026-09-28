import express from 'express';
import {
  sendOtp,
  verifyOtp,
  completeRegistration,
  getProfile,
  getMyWallet,
  getMyWalletTransactions,
  addBankDetail,
  getBankDetails,
  updateBankDetail,
  setPrimaryBank,
  deleteBankDetail,
  addUpiId,
  getUpiIds,
  updateUpiId,
  setPrimaryUpi,
  deleteUpiId,
} from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);


router.post('/register', upload.single('aadharImage'), completeRegistration);

router.get('/profile', protect, getProfile);
router.get('/my-wallet', protect, getMyWallet);
router.get('/my-transactions', protect, getMyWalletTransactions);

// ---------- bank ----------
router.post('/bank/add', protect, addBankDetail);
router.get('/bank/list', protect, getBankDetails);
router.put('/bank/update', protect, updateBankDetail);
router.patch('/bank/set-primary', protect, setPrimaryBank);
router.post('/bank/delete', protect, deleteBankDetail);

// ---------- upi ----------
router.post('/upi/add', protect, addUpiId);
router.get('/upi/list', protect, getUpiIds);
router.put('/upi/update', protect, updateUpiId);
router.patch('/upi/set-primary', protect, setPrimaryUpi);
router.post('/upi/delete', protect, deleteUpiId);

export default router;