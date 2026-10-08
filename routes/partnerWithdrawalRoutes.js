import express from "express";

import {
  requestWithdrawal,
  getMyWithdrawals,
  getWalletSummary,
  getWallet,
  getPartnerAmount,
  getRecentTransactions
} from "../controllers/withdrawalController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// PARTNER WITHDRAWAL ROUTES
// ==========================================

// Request withdrawal
// POST /api/partner/withdrawals
router.post("/withdrawals", protect, requestWithdrawal);

// Get my withdrawal history
router.get("/withdrawals", protect, getMyWithdrawals);

// Get wallet summary
router.get("/wallet/summary", protect, getWalletSummary);

// Get partner's wallet
router.get("/wallet", protect, getWallet);

router.get('/totalamount', protect, getPartnerAmount);

router.get('/recent-transactions', protect, getRecentTransactions);

export default router;
