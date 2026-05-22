/**
 * Authentication & Role-based Access Control middleware
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Verify JWT token ────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized — no token provided.' });
    }

    const token = authHeader.split('power_five_girls_health_queue_secret_key')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized — user not found.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Not authorized — invalid token.' });
  }
};

// ─── Role guard factory ──────────────────────────────────────────────────────
// Usage: authorizeRoles('super_admin', 'facility_admin')
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. This action requires one of: [${roles.join(', ')}].`,
      });
    }
    next();
  };
};

// ─── Shorthand guards ────────────────────────────────────────────────────────
const adminOnly = authorizeRoles('super_admin', 'facility_admin');
const superAdminOnly = authorizeRoles('super_admin');
const staffOnly = authorizeRoles('staff', 'facility_admin', 'super_admin');
const patientOnly = authorizeRoles('patient');

module.exports = { protect, authorizeRoles, adminOnly, superAdminOnly, staffOnly, patientOnly };
