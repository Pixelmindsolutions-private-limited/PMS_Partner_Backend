import Project from '../models/Project.js';
import Lead from '../models/Lead.js';
import mongoose from 'mongoose';

export const createProject = async (req, res) => {
  try {
    const partnerId = req.user?.id || req.body.partnerId;

    const {
      leadId,
      clientName,
      clientEmail,
      clientNumber,
      clientAddress,
      projectName,
      projectType,
      reference,
      description,
      budget,
      timePeriod,
      startDate,
      expectedEndDate,
      requirements,
    } = req.body;

    if (!partnerId || !mongoose.isValidObjectId(partnerId))
      return res.status(400).json({ success: false, message: 'A valid partnerId is required' });

    if (!leadId || !mongoose.isValidObjectId(leadId))
      return res.status(400).json({ success: false, message: 'A valid leadId is required' });

    const lead = await Lead.findOne({ _id: leadId, partner: partnerId });
    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });

    if (lead.clientStatus !== 'converted')
      return res.status(400).json({
        success: false,
        message: 'Lead must be converted before creating a project',
      });

    const existing = await Project.findOne({ lead: lead._id });
    if (existing)
      return res.status(400).json({
        success: false,
        message: 'Project already exists for this lead',
      });

    const budgetNum = budget ?? lead.budget ?? 0;

    const project = await Project.create({
      lead: lead._id,
      partner: partnerId,

      clientName: clientName || lead.clientName,
      clientEmail: clientEmail || lead.clientEmail,
      clientNumber: clientNumber || lead.clientNumber,
      clientAddress: clientAddress || lead.clientAddress,

      projectName: projectName || lead.projectName,
      projectType: projectType || lead.projectType,
      reference: reference || lead.reference,
      description,

      // ---------- budget ----------
      budget: budgetNum,
      totalPaid: 0,
      balanceDue: budgetNum,

      // ---------- commission (admin sets rate later) ----------
      commissionRate: 0,
      totalCommission: 0,
      commissionCredited: 0,
      commissionBalance: 0,

      // ---------- payment tracking ----------
      clientPayments: [],
      commissionPayments: [],

      // ---------- timeline ----------
      timePeriod: timePeriod || lead.timePeriod,
      startDate: startDate || lead.startDate,
      expectedEndDate,

      requirements,

      projectStatus: 'not_started',
      convertedAt: lead.updatedAt || new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// GET MY PROJECTS  →  GET + query params
// ======================================================
export const getMyProjects = async (req, res) => {
  try {
    // filters come from query string: ?status=in_progress&projectType=app
    const { status, projectType } = req.query;

    const filter = req.user ? { partner: req.user.id } : {};
    if (status) filter.projectStatus = status;
    if (projectType) filter.projectType = projectType;

    const projects = await Project.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// GET PROJECT BY ID
// ======================================================
export const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId || !mongoose.isValidObjectId(projectId))
      return res.status(400).json({ success: false, message: 'A valid projectId is required' });

    const filter = { _id: projectId };
    if (req.user) filter.partner = req.user.id;
    const project = await Project.findOne(filter);

    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    return res.json({ success: true, project });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// GET PROJECT BY LEAD
// ======================================================
export const getProjectByLead = async (req, res) => {
  try {
    const { leadId } = req.body;

    if (!leadId || !mongoose.isValidObjectId(leadId))
      return res.status(400).json({ success: false, message: 'A valid leadId is required' });

    const filter = { lead: leadId };
    if (req.user) filter.partner = req.user.id;
    const project = await Project.findOne(filter);

    if (!project)
      return res.status(404).json({
        success: false,
        message: 'Project not found for this lead',
      });

    return res.json({ success: true, project });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// UPDATE PROJECT
// ======================================================
export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId || !mongoose.isValidObjectId(projectId))
      return res.status(400).json({ success: false, message: 'A valid projectId is required' });

    const filter = { _id: projectId };
    if (req.user) filter.partner = req.user.id;
    const project = await Project.findOne(filter);

    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.projectStatus === 'completed')
      return res.status(400).json({
        success: false,
        message: 'Completed project cannot be edited',
      });

    if (project.projectStatus === 'cancelled')
      return res.status(400).json({
        success: false,
        message: 'Cancelled project cannot be edited',
      });

    // editable fields — NO payment fields, NO commission fields
    const updatable = [
      'clientName',
      'clientEmail',
      'clientNumber',
      'clientAddress',
      'projectName',
      'projectType',
      'reference',
      'description',
      'timePeriod',
      'startDate',
      'expectedEndDate',
      'requirements',
    ];

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) project[field] = req.body[field];
    });

    // ---------- budget change: recompute balanceDue + commissions ----------
    if (req.body.budget !== undefined) {
      const newBudget = Number(req.body.budget);

      if (isNaN(newBudget) || newBudget < 0)
        return res.status(400).json({
          success: false,
          message: 'budget must be a non-negative number',
        });

      if (newBudget < (project.totalPaid || 0))
        return res.status(400).json({
          success: false,
          message: `budget cannot be less than amount already paid (₹${project.totalPaid})`,
        });

      project.budget = newBudget;
      project.balanceDue = Math.max(newBudget - (project.totalPaid || 0), 0);

      project.totalCommission = Math.round(
        (newBudget * (project.commissionRate || 0)) / 100
      );
      project.commissionBalance = Math.max(
        project.totalCommission - (project.commissionCredited || 0),
        0
      );
    }

    await project.save();

    return res.json({
      success: true,
      message: 'Project updated successfully',
      project,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// UPDATE PROJECT STATUS
// ======================================================
export const updateProjectStatus = async (req, res) => {
  try {
    const { projectId, projectStatus } = req.body;

    if (!projectId || !mongoose.isValidObjectId(projectId))
      return res.status(400).json({ success: false, message: 'A valid projectId is required' });

    const allowed = ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'];
    if (!allowed.includes(projectStatus))
      return res.status(400).json({
        success: false,
        message: `projectStatus must be one of: ${allowed.join(', ')}`,
      });

    const filter = { _id: projectId };
    if (req.user) filter.partner = req.user.id;
    const project = await Project.findOne(filter);

    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.projectStatus === 'cancelled')
      return res.status(400).json({
        success: false,
        message: 'Cancelled project status cannot be changed',
      });

    project.projectStatus = projectStatus;
    await project.save();

    return res.json({
      success: true,
      message: 'Project status updated',
      project,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ======================================================
// DELETE PROJECT
// ======================================================
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId || !mongoose.isValidObjectId(projectId))
      return res.status(400).json({ success: false, message: 'A valid projectId is required' });

    const filter = { _id: projectId };
    if (req.user) filter.partner = req.user.id;
    const project = await Project.findOne(filter);

    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.projectStatus === 'in_progress')
      return res.status(400).json({
        success: false,
        message: 'In-progress project cannot be deleted',
      });

    await project.deleteOne();

    return res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const addProjectLink = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { projectId, label, url, type } = req.body;

    if (!projectId)
      return res.status(400).json({ success: false, message: 'projectId is required' });

    if (!label || !url)
      return res.status(400).json({
        success: false,
        message: 'label and url are required',
      });

    const project = await Project.findOne({ _id: projectId, partner: partnerId });
    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    const normalizedLabel = label.trim().toLowerCase();
    const normalizedUrl = url.trim();

    // duplicate label check (case-insensitive)
    const labelExists = project.links.some(
      (l) => l.label.trim().toLowerCase() === normalizedLabel
    );
    if (labelExists)
      return res.status(400).json({
        success: false,
        message: 'A link with this label already exists',
      });

    // duplicate url check
    const urlExists = project.links.some((l) => l.url === normalizedUrl);
    if (urlExists)
      return res.status(400).json({
        success: false,
        message: 'This URL is already added',
      });

    project.links.push({
      label: label.trim(),
      url: normalizedUrl,
      type: type ? type.toLowerCase().trim() : 'other',
    });

    await project.save();

    return res.status(201).json({
      success: true,
      message: 'Link added successfully',
      links: project.links,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// GET PROJECT LINKS
// ======================================================
export const getProjectLinks = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { projectId } = req.body;

    if (!projectId)
      return res.status(400).json({ success: false, message: 'projectId is required' });

    const project = await Project.findOne({ _id: projectId, partner: partnerId }).select('links');
    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    return res.json({
      success: true,
      count: project.links.length,
      links: project.links,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// UPDATE PROJECT LINK
// ======================================================
export const updateProjectLink = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { projectId, linkId, label, url, type } = req.body;

    if (!projectId || !linkId)
      return res.status(400).json({
        success: false,
        message: 'projectId and linkId are required',
      });

    const project = await Project.findOne({ _id: projectId, partner: partnerId });
    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    const link = project.links.id(linkId);
    if (!link)
      return res.status(404).json({ success: false, message: 'Link not found' });

    // ---------- duplicate label check (excluding self) ----------
    if (label !== undefined) {
      const normalizedLabel = label.trim().toLowerCase();
      const labelExists = project.links.some(
        (l) =>
          l._id.toString() !== linkId &&
          l.label.trim().toLowerCase() === normalizedLabel
      );
      if (labelExists)
        return res.status(400).json({
          success: false,
          message: 'Another link already has this label',
        });
      link.label = label.trim();
    }

    // ---------- duplicate url check (excluding self) ----------
    if (url !== undefined) {
      const normalizedUrl = url.trim();
      const urlExists = project.links.some(
        (l) => l._id.toString() !== linkId && l.url === normalizedUrl
      );
      if (urlExists)
        return res.status(400).json({
          success: false,
          message: 'Another link already has this URL',
        });
      link.url = normalizedUrl;
    }

    // ---------- type ----------
    if (type !== undefined) {
      link.type = type.toLowerCase().trim();
    }

    await project.save();

    return res.json({
      success: true,
      message: 'Link updated successfully',
      links: project.links,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// DELETE PROJECT LINK
// ======================================================
export const deleteProjectLink = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { projectId, linkId } = req.body;

    if (!projectId || !linkId)
      return res.status(400).json({
        success: false,
        message: 'projectId and linkId are required',
      });

    const project = await Project.findOne({ _id: projectId, partner: partnerId });
    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    const link = project.links.id(linkId);
    if (!link)
      return res.status(404).json({ success: false, message: 'Link not found' });

    link.deleteOne();
    await project.save();

    return res.json({
      success: true,
      message: 'Link deleted successfully',
      links: project.links,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};  
