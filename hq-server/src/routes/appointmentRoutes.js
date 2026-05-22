const express = require('express');
const router  = express.Router();
const {
  bookAppointment,
  getAppointments,
  getAppointment,
  updateStatus,
  cancelAppointment,
  getAvailableSlots,
  getTodayAppointments,
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
} = require('../controllers/appointmentController');
const { protect, authorizeRoles, patientOnly } = require('../middleware/auth');

router.use(protect);

// ── Time Slots (admin/facility_admin) ─────────────────────────────────────────
// MUST be defined BEFORE /:id routes to avoid route conflicts
router.get('/timeslots',      authorizeRoles('super_admin', 'facility_admin'), getTimeSlots);
router.post('/timeslots',     authorizeRoles('super_admin', 'facility_admin'), createTimeSlot);
router.put('/timeslots/:id',  authorizeRoles('super_admin', 'facility_admin'), updateTimeSlot);
router.delete('/timeslots/:id', authorizeRoles('super_admin', 'facility_admin'), deleteTimeSlot);

// ── Available Slots (patients & admins) ───────────────────────────────────────
router.get('/available-slots', getAvailableSlots);

// ── Today (staff/admin) ───────────────────────────────────────────────────────
router.get('/today', authorizeRoles('staff', 'facility_admin', 'super_admin'), getTodayAppointments);

// ── List / Book ───────────────────────────────────────────────────────────────
router.get('/',   getAppointments);
router.post('/',  patientOnly, bookAppointment);

// ── Single ────────────────────────────────────────────────────────────────────
router.get('/:id', getAppointment);

// ── Status updates ────────────────────────────────────────────────────────────
router.put('/:id/status', authorizeRoles('staff', 'facility_admin', 'super_admin'), updateStatus);
router.put('/:id/cancel', patientOnly, cancelAppointment);

module.exports = router;
