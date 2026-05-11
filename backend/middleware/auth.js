const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (!req.user.isActive) {
      return res.status(401).json({ message: 'Account deactivated' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized for this action' });
    }
    next();
  };
};

const orgAccess = async (req, res, next) => {
  try {
    const orgId = req.params.orgId || req.body.organization || req.user.organization;
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID required' });
    }

    if (req.user.organization && req.user.organization.toString() === orgId.toString()) {
      req.orgId = orgId;
      return next();
    }
    return res.status(403).json({ message: 'No access to this organization' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { protect, authorize, orgAccess };
