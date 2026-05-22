/**
 * Staff Controller — manage staff profiles, assignments, schedules
 * Used by: facility_admin (own clinic), super_admin (all)
 */
const Staff = require('../models/Staff');
const User  = require('../models/User');

// GET /api/staff  — list staff (facility_admin scoped to own clinic)
const getStaff = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'facility_admin') filter.clinic = req.user.clinicId;
    else if (req.query.clinicId) filter.clinic = req.query.clinicId;

    const staff = await Staff.find(filter)
      .populate('user', 'email isActive')
      .populate('clinic', 'name')
      .sort({ createdAt: -1 });
    return res.json(staff);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch staff.' });
  }
};

// GET /api/staff/:id
const getStaffMember = async (req, res) => {
  try {
    const member = await Staff.findById(req.params.id)
      .populate('user', 'email isActive')
      .populate('clinic', 'name');
    if (!member) return res.status(404).json({ message: 'Staff member not found.' });
    return res.json(member);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch staff member.' });
  }
};

// PUT /api/staff/:id — update position, specialization, schedule, isActive
const updateStaff = async (req, res) => {
  try {
    const allowed = ['position', 'specialization', 'licenseNumber', 'schedule', 'isActive', 'phone'];
    const update = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const member = await Staff.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!member) return res.status(404).json({ message: 'Staff member not found.' });

    // Sync isActive to User account
    if (update.isActive !== undefined) {
      await User.findByIdAndUpdate(member.user, { isActive: update.isActive });
    }
    return res.json(member);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update staff member.' });
  }
};

// DELETE /api/staff/:id — deactivate (soft delete)
const deactivateStaff = async (req, res) => {
  try {
    const member = await Staff.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!member) return res.status(404).json({ message: 'Staff member not found.' });
    await User.findByIdAndUpdate(member.user, { isActive: false });
    return res.json({ message: 'Staff member deactivated.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to deactivate staff member.' });
  }
};

module.exports = { getStaff, getStaffMember, updateStaff, deactivateStaff };
