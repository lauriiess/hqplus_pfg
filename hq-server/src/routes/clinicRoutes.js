const express = require('express');
const router = express.Router();
const {
  getClinics,
  getClinic,
  createClinic,
  updateClinic,
  deleteClinic,
  getClinicDirectory,
  recommendClinic,
} = require('../controllers/clinicController');
const { protect, authorizeRoles, superAdminOnly, adminOnly } = require('../middleware/auth');

router.use(protect);

// GET /api/clinics/directory — public-facing clinic list with live stats
router.get('/directory', getClinicDirectory);

// GET /api/clinics/recommend — AI recommendation
router.get('/recommend', recommendClinic);

// CRUD (admin only)
router.get('/', getClinics);
router.post('/', superAdminOnly, createClinic);
router.get('/:id', getClinic);
router.put('/:id', adminOnly, updateClinic);
router.delete('/:id', superAdminOnly, deleteClinic);

module.exports = router;
