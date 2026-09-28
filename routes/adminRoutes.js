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
    getProjectPayments
 } from '../controllers/adminController.js';

const router = express.Router();

router.post('/login', adminLogin);
router.patch('/approve', adminProtect, approvePartner);
router.post('/wallet/add-money', adminProtect, addMoneyToWallet);
router.post('/wallet/deduct-money', adminProtect, deductMoneyFromWallet);

//Banners
router.get('/list', protect, adminProtect, getAllBanners);
router.post('/get-banner', adminProtect, getBannerById);

router.post('/create', adminProtect, bannerUpload.single('image'), createBanner);
router.put('/update', adminProtect, bannerUpload.single('image'), updateBanner);
router.post('/delete', adminProtect, deleteBanner);

router.patch('/projects/set-commission', adminProtect, setCommissionRate);
router.post('/projects/add-client-payment', adminProtect, addClientPayment);
router.post('/projects/payments', adminProtect, getProjectPayments);


export default router;