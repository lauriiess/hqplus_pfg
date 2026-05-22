const express = require('express');
const router = express.Router();
const {
  bookAppointment,
  getAppointments,
  getAppointment,
  updateStatus,
  cancelAppointment,
  getAvailableSlots,
  getTodayAppointments,
} = require('../controllers/appointmentController');
const { protect, authorizeRoles, patientOnly } = require('../middleware/auth');

router.use(protect);

// GET /api/appointments/available-slots — check available slots (patient or public)
router.get('/available-slots', getAvailableSlots);

// GET /api/appointments/today — today's appointments (staff/admin)
router.get('/today', authorizeRoles('staff','facility_admin','super_admin'), getTodayAppointments);

// GET /api/appointments — list appointments
router.get('/', getAppointments);

// POST /api/appointments — book appointment (patient)
router.post('/', patientOnly, bookAppointment);

// GET /api/appointments/:id
router.get('/:id', getAppointment);

// PUT /api/appointments/:id/status — update status (staff/admin)
router.put('/:id/status', authorizeRoles('staff','facility_admin','super_admin'), updateStatus);

// PUT /api/appointments/:id/cancel — patient cancels own appointment
router.put('/:id/cancel', patientOnly, cancelAppointment);

module.exports = router;
