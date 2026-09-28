import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createProject,
  getMyProjects,
  getProjectById,
  getProjectByLead,
  updateProject,
  updateProjectStatus,
  deleteProject,
} from '../controllers/projectController.js';

const router = express.Router();

// all project routes require partner JWT
router.use(protect);

// ---------- listing (GET + query params) ----------
router.get('/my-projects', getMyProjects);

// ---------- lookup (POST + body) ----------
router.post('/get-project', getProjectById);
router.post('/get-by-lead', getProjectByLead);

// ---------- mutations (body) ----------
router.post('/create-project', createProject);
router.put('/update-project', updateProject);
router.patch('/update-status', updateProjectStatus);
router.post('/delete-project', deleteProject);


export default router;