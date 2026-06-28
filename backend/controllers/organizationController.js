const Organization = require('../models/Organization');
const User = require('../models/User');
const emailService = require('../services/emailService');

exports.getOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organization)
      .populate('owner', 'name email')
      .populate('members', 'name email role isActive currentWorkload');
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({ organization: org });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrganization = async (req, res) => {
  try {
    const { name, website, logo, industry, widgetConfig, aiConfig, settings } = req.body;
    const org = await Organization.findById(req.user.organization);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    if (name) org.name = name;
    if (website) org.website = website;
    if (logo) org.logo = logo;
    if (industry) org.industry = industry;
    if (widgetConfig) org.widgetConfig = { ...org.widgetConfig.toObject?.() || org.widgetConfig, ...widgetConfig };
    if (aiConfig) org.aiConfig = { ...org.aiConfig.toObject?.() || org.aiConfig, ...aiConfig };
    if (settings) org.settings = { ...org.settings.toObject?.() || org.settings, ...settings };

    await org.save();
    res.json({ organization: org });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMembers = async (req, res) => {
  try {
    const members = await User.find({ organization: req.user.organization })
      .select('name email role isActive currentWorkload expertise lastLogin createdAt');
    res.json({ members });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const { role, isActive, expertise, maxWorkload } = req.body;
    const member = await User.findOne({ _id: req.params.memberId, organization: req.user.organization });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (role) member.role = role;
    if (typeof isActive === 'boolean') member.isActive = isActive;
    if (expertise) member.expertise = expertise;
    if (maxWorkload) member.maxWorkload = maxWorkload;

    await member.save();
    res.json({ member: member.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const member = await User.findOne({ _id: req.params.memberId, organization: req.user.organization });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (member._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot remove yourself' });
    }

    await Organization.findByIdAndUpdate(req.user.organization, {
      $pull: { members: member._id }
    });

    await User.findByIdAndDelete(member._id);

    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWidgetConfig = async (req, res) => {
  try {
    const org = await Organization.findOne({ slug: req.params.slug });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({
      widgetConfig: org.widgetConfig,
      organizationId: org._id,
      name: org.name
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmailStatus = async (req, res) => {
  try {
    const verification = await emailService.verifyConnection();
    res.json({
      ...emailService.getStatus(),
      verification
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendTestEmail = async (req, res) => {
  try {
    const to = req.body.email || req.user.email;
    const result = await emailService.send(
      to,
      'ResolveAI email test',
      '<p>This is a test email from ResolveAI production email configuration.</p>'
    );

    if (!result.sent) {
      return res.status(502).json({ message: 'Email test failed', error: result.error });
    }

    res.json({ message: 'Test email sent', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
