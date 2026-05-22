/**
 * Auth Controller — handles register, login, get-me, OTP
 */
const User = require('../models/User');
const Patient = require('../models/Patient');
const { signToken } = require('../utils/token');

// ─── Register ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Body: { fullName, email, phone, password, role? }
// Role defaults to 'patient'. Admin/staff accounts created via admin panel only.
const register = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    // Only patients can self-register
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      password,
      role: 'patient',
      isVerified: false,
    });

    // Automatically create a Patient profile
    await Patient.create({
      user: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// ─── Get current user ─────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
const getMe = async (req, res) => {
  return res.json({ user: req.user.toSafeObject() });
};

// ─── Change password ──────────────────────────────────────────────────────────
// PUT /api/auth/change-password  (protected)
// Body: { currentPassword, newPassword }
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();
    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to change password.' });
  }
};

module.exports = { register, login, getMe, changePassword };
