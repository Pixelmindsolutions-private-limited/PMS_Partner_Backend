import Lead from '../models/Lead.js';
import Project from '../models/Project.js';
import { createNotification } from '../utils/createNotification.js';


// ======================================================
// CREATE LEAD
// ======================================================
export const createLead = async (req, res) => {
  try {
    const partnerId = req.user.id;   // extracted from token by protect

    const {
      clientName,
      clientEmail,
      clientNumber,
      clientAddress,
      projectName,
      budget,
      reference,
      timePeriod,
      startDate,
      projectType,
    } = req.body;

    if (!clientName || !clientNumber)
      return res.status(400).json({
        success: false,
        message: 'clientName and clientNumber are required',
      });

    const lead = await Lead.create({
      partner: partnerId,
      clientName,
      clientEmail,
      clientNumber,
      clientAddress,
      projectName,
      budget,
      reference,
      timePeriod,
      startDate,
      projectType,
    });

    await createNotification({
      partner: partnerId,
      type: 'lead_added',
      title: 'New lead added',
      message: `${lead.clientName} has been added as a new lead`,
      referenceId: lead._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      lead,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// GET MY LEADS
// ======================================================
export const getMyLeads = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const { status, projectType } = req.query;

    const filter = { partner: partnerId };
    if (status) filter.clientStatus = status;
    if (projectType) filter.projectType = projectType;

    const leads = await Lead.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { leadId } = req.body;

    if (!leadId)
      return res.status(400).json({ success: false, message: 'leadId is required' });

    const lead = await Lead.findOne({ _id: leadId, partner: partnerId });

    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });

    return res.json({ success: true, lead });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// UPDATE LEAD  →  leadId in body
// ======================================================
export const updateLead = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { leadId } = req.body;

    if (!leadId)
      return res.status(400).json({ success: false, message: 'leadId is required' });

    const lead = await Lead.findOne({ _id: leadId, partner: partnerId });

    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });

    if (lead.clientStatus === 'converted')
      return res.status(400).json({
        success: false,
        message: 'Converted lead cannot be edited',
      });

    const updatable = [
      'clientName',
      'clientEmail',
      'clientNumber',
      'clientAddress',
      'projectName',
      'budget',
      'reference',
      'timePeriod',
      'startDate',
      'projectType',
    ];

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) lead[field] = req.body[field];
    });

    await lead.save();

    return res.json({
      success: true,
      message: 'Lead updated successfully',
      lead,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// UPDATE LEAD STATUS  →  leadId in body
// ======================================================
export const updateLeadStatus = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { leadId, status } = req.body;

    if (!leadId)
      return res.status(400).json({ success: false, message: 'leadId is required' });

    if (!['pending', 'rejected'].includes(status))
      return res.status(400).json({
        success: false,
        message: "status must be 'pending' or 'rejected'",
      });

    const lead = await Lead.findOne({ _id: leadId, partner: partnerId });

    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });

    if (lead.clientStatus === 'converted')
      return res.status(400).json({
        success: false,
        message: 'Converted lead status cannot be changed',
      });

    lead.clientStatus = status;
    await lead.save();

    return res.json({
      success: true,
      message: 'Lead status updated',
      lead,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// DELETE LEAD  →  leadId in body
// ======================================================
export const deleteLead = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { leadId } = req.body;

    if (!leadId)
      return res.status(400).json({ success: false, message: 'leadId is required' });

    const lead = await Lead.findOne({ _id: leadId, partner: partnerId });

    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });

    if (lead.clientStatus === 'converted')
      return res.status(400).json({
        success: false,
        message: 'Converted lead cannot be deleted',
      });

    await lead.deleteOne();

    return res.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// CONVERT LEAD  →  leadId in body
// ======================================================
export const convertLead = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { leadId } = req.body;

    if (!leadId)
      return res.status(400).json({ success: false, message: 'leadId is required' });

    const lead = await Lead.findOne({ _id: leadId, partner: partnerId });

    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });

    if (lead.clientStatus === 'converted')
      return res.status(400).json({ success: false, message: 'Lead already converted' });

    if (lead.clientStatus === 'rejected')
      return res.status(400).json({ success: false, message: 'Rejected lead cannot be converted' });

    const existing = await Project.findOne({ lead: lead._id });
    if (existing)
      return res.status(400).json({ success: false, message: 'Project already exists for this lead' });

    lead.clientStatus = 'converted';
    await lead.save();

    const project = await Project.create({
      lead: lead._id,
      partner: partnerId,
      clientName: lead.clientName,
      clientEmail: lead.clientEmail,
      clientNumber: lead.clientNumber,
      clientAddress: lead.clientAddress,
      projectName: lead.projectName,
      projectType: lead.projectType,
      reference: lead.reference,
      budget: lead.budget || 0,
      commissionRate: 0,
      totalCommission: 0,
      commissionCredited: 0,
      commissionBalance: 0,
      clientPayments: [],
      commissionPayments: [],
      balanceDue: lead.budget || 0,
      timePeriod: lead.timePeriod,
      startDate: lead.startDate,
      projectStatus: 'not_started',
      convertedAt: new Date(),
    });

    await createNotification({
      partner: partnerId,
      type: 'lead_converted',
      title: 'Lead converted to project',
      message: `Lead for ${lead.clientName} converted to project "${project.projectName || lead.clientName}"`,
      referenceId: project._id,
    });

    return res.json({
      success: true,
      message: 'Lead converted and project created successfully',
      lead,
      project,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};