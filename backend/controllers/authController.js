const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, organizationName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    const user = await User.create({ name, email, password, role: 'admin' });

    const organization = await Organization.create({
      name: organizationName,
      slug,
      owner: user._id,
      members: [user._id]
    });

    user.organization = organization._id;
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      refreshToken,
      user: user.toJSON(),
      organization
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('organization');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account deactivated' });
    }

    user.lastLogin = new Date();
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      refreshToken,
      user: user.toJSON(),
      organization: user.organization
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('organization');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.inviteMember = async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const orgId = req.user.organization;

    const org = await Organization.findById(orgId);
    const orgName = org?.name || 'Your Organization';

    let user = await User.findOne({ email });

    if (user) {
      user.organization = orgId;
      if (role) user.role = role;
      user.isActive = true;
      await user.save();

      await Organization.findByIdAndUpdate(orgId, { $addToSet: { members: user._id } });

      const emailService = require('../services/emailService');
      const inviteLink = `${process.env.FRONTEND_URL}/login`;
      await emailService.sendInvitation(email, orgName, inviteLink);

      return res.status(200).json({ message: 'Existing user added to team', user: user.toJSON() });
    }

    const tempPassword = Math.random().toString(36).slice(-10);
    user = await User.create({
      name,
      email,
      password: tempPassword,
      role: role || 'agent',
      organization: orgId
    });

    await Organization.findByIdAndUpdate(orgId, { $addToSet: { members: user._id } });

    const emailService = require('../services/emailService');
    const inviteLink = `${process.env.FRONTEND_URL}/login`;
    await emailService.sendInvitation(email, orgName, inviteLink, tempPassword);

    res.status(201).json({ message: 'Invite sent successfully', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
