import express from 'express';
import { adminProtect, protect } from '../middleware/authMiddleware.js';
import { bannerUpload } from '../middleware/upload.js';
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
    getPartnersByStatus
 } from '../controllers/adminController.js';

const router = express.Router();

router.post('/login', adminLogin);
router.patch('/approve', adminProtect, approvePartner);
router.get("/partners/filter", getPartnersByStatus);//hina
router.post('/wallet/add-money', adminProtect, addMoneyToWallet);
router.post('/wallet/deduct-money', adminProtect, deductMoneyFromWallet);

//Banners
router.get('/list',  adminProtect, getAllBanners);
router.post('/get-banner', adminProtect, getBannerById);

router.post('/create', adminProtect, bannerUpload.single('image'), createBanner);
router.put('/update', adminProtect, bannerUpload.single('image'), updateBanner);
router.post('/delete', adminProtect, deleteBanner);

router.patch('/projects/set-commission', adminProtect, setCommissionRate);
router.post('/projects/add-client-payment', adminProtect, addClientPayment);
router.post('/projects/payments', adminProtect, getProjectPayments);

router.get('/users', adminProtect, getAllUsers);//hina

export default router;