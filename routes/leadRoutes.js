// routes/leadRoutes.js
import express from 'express';
import { protect, } from '../middleware/authMiddleware.js';
import {
  createLead,
  getMyLead,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
  convertLead,
  getMyLeads
} from '../controllers/leadController.js';

const router = express.Router();

// every lead route requires a valid partner JWT
router.use(protect);

router.post('/create', createLead);
router.get('/my-leads', getMyLead);
router.post('/get-lead', getLeadById);
router.put('/update-lead', updateLead);
router.patch('/update-status', updateLeadStatus);
router.delete('/delete-lead', deleteLead);
router.post('/convert-lead', convertLead);
router.get('/my-leads', getMyLeads);

export default router;