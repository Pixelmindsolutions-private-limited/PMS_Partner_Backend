import Lead from '../models/Lead.js';

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

    const { status, projectType } = req.body;

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

// ======================================================
// GET LEAD BY ID  →  leadId in body
// ======================================================
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
      return res.status(400).json({
        success: false,
        message: 'Lead already converted',
      });

    if (lead.clientStatus === 'rejected')
      return res.status(400).json({
        success: false,
        message: 'Rejected lead cannot be converted',
      });

    lead.clientStatus = 'converted';
    await lead.save();

    // TODO: create Project using partnerId + lead details
    // const project = await Project.create({
    //   lead: lead._id,
    //   partner: partnerId,
    //   ...
    // });

    return res.json({
      success: true,
      message: 'Lead converted successfully',
      lead,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};