// routes/leadRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createLead,
  getMyLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
  convertLead,
} from '../controllers/leadController.js';

const router = express.Router();

// every lead route requires a valid partner JWT
router.use(protect);

router.post('/create', createLead);
router.get('/my-leads', getMyLeads);
router.post('/get-lead', getLeadById);
router.put('/update-lead', updateLead);
router.patch('/update-status', updateLeadStatus);
router.post('/delete-lead', deleteLead);
router.post('/convert-lead', convertLead);

export default router;