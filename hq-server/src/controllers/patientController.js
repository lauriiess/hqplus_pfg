/**
 * Patient Controller — admin view of patient records
 * Used by: super_admin, facility_admin
 */
const Patient = require('../models/Patient');
const User    = require('../models/User');

// GET /api/patients — list all patients (with optional search)
const getPatients = async (req, res) => {
  try {
    const { search, patientType } = req.query;
    const filter = {};
    if (patientType) filter.patientType = patientType;

    let patients = await Patient.find(filter)
      .populate('user', 'email isActive createdAt')
      .sort({ createdAt: -1 });

    if (search) {
      const s = search.toLowerCase();
      patients = patients.filter(
        (p) =>
          p.fullName?.toLowerCase().includes(s) ||
          p.email?.toLowerCase().includes(s) ||
          p.phone?.includes(s) ||
          p.philHealthNumber?.toLowerCase().includes(s)
      );
    }

    return res.json(patients);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch patients.' });
  }
};

// GET /api/patients/:id
const getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('user', 'email isActive createdAt');
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    return res.json(patient);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch patient.' });
  }
};

// PUT /api/patients/:id — admin can update patient details
const updatePatient = async (req, res) => {
  try {
    const allowed = ['fullName', 'dob', 'age', 'gender', 'phone', 'email', 'address', 'philHealthNumber', 'hmoProvider', 'patientType', 'medicalNotes'];
    const update = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const patient = await Patient.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    return res.json(patient);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update patient.' });
  }
};

// DELETE /api/patients/:id — deactivate patient account
const deactivatePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    await User.findByIdAndUpdate(patient.user, { isActive: false });
    return res.json({ message: 'Patient account deactivated.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to deactivate patient.' });
  }
};

module.exports = { getPatients, getPatient, updatePatient, deactivatePatient };
