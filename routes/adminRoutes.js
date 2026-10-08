import express from "express";
import { adminProtect, protect } from "../middleware/authMiddleware.js";
import { bannerUpload } from "../middleware/upload.js";
import {
  createProject,
  getMyProjects,
  getProjectById,
  getProjectByLead,
  updateProject,
  updateProjectStatus,
  deleteProject,
} from "../controllers/projectController.js";
import {
  adminLogin,
  approvePartner,
  addMoneyToWallet,
  deductMoneyFromWallet,
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  setCommissionRate,
  addClientPayment,
  getProjectPayments,
  getAllUsers,
  getPartnersByStatus,
  getAllWithdrawals,
  getWithdrawalById,
  approveWithdrawal,
  rejectWithdrawal,
  createLead,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
  convertLead,
  getAllLeads,
  getAllPartnerTransactions
} from "../controllers/adminController.js";

const router = express.Router();

router.post("/login", adminLogin);
router.patch("/approve", adminProtect, approvePartner);
router.get("/partners/filter", getPartnersByStatus); //hina
router.post("/wallet/add-money", adminProtect, addMoneyToWallet);
router.post("/wallet/deduct-money", adminProtect, deductMoneyFromWallet);

//Banners
router.get("/list", adminProtect, getAllBanners);
router.post("/get-banner", adminProtect, getBannerById);

router.post(
  "/create",
  adminProtect,
  bannerUpload.single("image"),
  createBanner,
);
router.put("/update", adminProtect, bannerUpload.single("image"), updateBanner);
router.post("/delete", adminProtect, deleteBanner);

router.patch("/projects/set-commission", adminProtect, setCommissionRate);
router.post("/projects/add-client-payment", adminProtect, addClientPayment);
router.post("/projects/payments", adminProtect, getProjectPayments);
router.get("/my-projects", adminProtect, getMyProjects);
router.post("/get-project", adminProtect, getProjectById);
router.post("/get-by-lead", adminProtect, getProjectByLead);
router.post("/create-project", adminProtect, createProject);
router.put("/update-project", adminProtect, updateProject);
router.patch("/update-status", adminProtect, updateProjectStatus);
router.post("/delete-project", adminProtect, deleteProject);

router.get("/users", adminProtect, getAllUsers); //hina

// ==========================================
// ADMIN WITHDRAWAL ROUTES
// ==========================================

// Get all withdrawal requests
router.get("/withdrawals", adminProtect, getAllWithdrawals); //hina

// Get single withdrawal
router.get("/withdrawals/:id", adminProtect, getWithdrawalById); //hina

// Approve withdrawal
router.put("/withdrawals/:id/approve", adminProtect, approveWithdrawal); //hina

// Reject withdrawal
router.put("/withdrawals/:id/reject", adminProtect, rejectWithdrawal); //hina
router.post("/create", adminProtect, createLead);
router.get("/leads", adminProtect, getAllLeads);
router.post("/get-lead", adminProtect, getLeadById);
router.put("/update-lead", adminProtect, updateLead);
router.patch("/update-status", adminProtect, updateLeadStatus);
router.delete("/delete-lead", adminProtect, deleteLead);
router.post("/convert-lead", adminProtect, convertLead);
router.get("/my-leads", adminProtect, getAllLeads);
router.get("/transactions", adminProtect, getAllPartnerTransactions);

export default router;
