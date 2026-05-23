/**
 * Appointment Controller — full CRUD + status management
 */
const Appointment = require('../models/Appointment');
const Clinic = require('../models/Clinic');
const Patient = require('../models/Patient');
const TimeSlot = require('../models/TimeSlot');
const QueueEntry = require('../models/QueueEntry');
const Notification = require('../models/Notification');
const { getNextQueueNumber, estimateWaitTime } = require('../utils/queueHelpers');

// ─── Book a new appointment (patient) ────────────────────────────────────────
// POST /api/appointments
const bookAppointment = async (req, res) => {
  try {
    const { clinicId, serviceName, serviceId, staffId, appointmentDate, timeSlot, endTime, reason, notes } = req.body;
    if (!clinicId || !serviceName || !appointmentDate || !timeSlot) {
      return res.status(400).json({ message: 'clinicId, serviceName, appointmentDate, and timeSlot are required.' });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    if (!clinic.acceptsAppointment) {
      return res.status(400).json({ message: 'This clinic does not accept appointments.' });
    }

    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) return res.status(404).json({ message: 'Patient profile not found.' });

    // Double-booking check: same patient, same clinic, same date+slot
    const apptDate = new Date(appointmentDate);
    const dayStart = new Date(apptDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(apptDate); dayEnd.setHours(23, 59, 59, 999);

    const existing = await Appointment.findOne({
      clinic: clinicId,
      patient: patientProfile._id,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      timeSlot,
      status: { $nin: ['cancelled', 'no_show'] },
    });
    if (existing) {
      return res.status(409).json({ message: 'You already have an appointment at this clinic for this time slot.' });
    }

    // Check slot capacity (how many bookings exist for this slot)
    if (serviceId) {
      const slotCount = await Appointment.countDocuments({
        clinic: clinicId,
        serviceId,
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
        timeSlot,
        status: { $nin: ['cancelled', 'no_show'] },
      });
      const slot = await TimeSlot.findOne({ clinic: clinicId, serviceId, startTime: timeSlot.replace(' AM','').replace(' PM','') });
      if (slot && slotCount >= slot.maxPatients) {
        return res.status(409).json({ message: 'This time slot is fully booked. Please choose another slot.' });
      }
    }

    const appointment = await Appointment.create({
      clinic: clinicId,
      patient: patientProfile._id,
      staff: staffId || null,
      serviceName,
      serviceId: serviceId || null,
      appointmentDate: apptDate,
      timeSlot,
      endTime: endTime || '',
      patientName: patientProfile.fullName,
      patientPhone: patientProfile.phone,
      patientType: patientProfile.patientType,
      reason: reason || '',
      notes: notes || '',
      status: 'pending',
    });

    await appointment.populate(['clinic', 'patient']);

    // Notify patient
    await Notification.create({
      user: req.user._id,
      title: 'Appointment Booked',
      message: `Your appointment at ${clinic.name} for ${serviceName} on ${apptDate.toDateString()} at ${timeSlot} is pending confirmation.`,
      type: 'appointment',
      refType: 'Appointment',
      refId: appointment._id,
    });

    return res.status(201).json(appointment);
  } catch (err) {
    console.error('Book appointment error:', err.message);
    return res.status(500).json({ message: 'Failed to book appointment. Please try again.' });
  }
};

// ─── Get appointments (filtered) ─────────────────────────────────────────────
// GET /api/appointments?clinicId=&status=&date=&patientId=
const getAppointments = async (req, res) => {
  try {
    const { clinicId, status, date, patientId } = req.query;
    const filter = {};

    if (clinicId) filter.clinic = clinicId;
    if (status) filter.status = status;
    if (patientId) filter.patient = patientId;

    if (date) {
      const d = new Date(date);
      filter.appointmentDate = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    // RBAC scoping
    if (req.user.role === 'facility_admin' && req.user.clinicId) {
      filter.clinic = req.user.clinicId;
    }
    if (req.user.role === 'staff' && req.user.clinicId) {
      filter.clinic = req.user.clinicId;
    }
    if (req.user.role === 'patient') {
      const patientProfile = await Patient.findOne({ user: req.user._id });
      if (patientProfile) filter.patient = patientProfile._id;
    }

    const appointments = await Appointment.find(filter)
      .populate('clinic', 'name address contactNumber')
      .populate('patient', 'fullName phone patientType')
      .populate('staff', 'fullName position')
      .sort({ appointmentDate: 1, timeSlot: 1 });

    return res.json(appointments);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get appointments.' });
  }
};

// ─── Get single appointment ───────────────────────────────────────────────────
const getAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('clinic', 'name address contactNumber')
      .populate('patient', 'fullName phone patientType')
      .populate('staff', 'fullName position');
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get appointment.' });
  }
};

// ─── Update appointment status (staff/admin) ──────────────────────────────────
// PUT /api/appointments/:id/status
// Body: { status, notes? }
const updateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const allowed = ['pending','confirmed','arrived','serving','completed','late','no_show','cancelled','rescheduled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }

    const appt = await Appointment.findById(req.params.id).populate('clinic', 'name');
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });

    const prev = appt.status;
    appt.status = status;
    if (notes) appt.notes = notes;

    // Track timestamps
    if (status === 'confirmed' && !appt.confirmedAt) appt.confirmedAt = new Date();
    if (status === 'arrived' && !appt.arrivedAt) appt.arrivedAt = new Date();
    if (['completed', 'no_show', 'cancelled'].includes(status) && !appt.completedAt) appt.completedAt = new Date();
    if (status === 'cancelled') {
      appt.cancelledAt = new Date();
      appt.cancelledBy = req.user.role;
    }

    // If patient arrived, auto-create a queue entry
    if (status === 'arrived' && !appt.queueEntry) {
      const clinic = await Clinic.findById(appt.clinic);
      const prefix = clinic ? clinic.name.charAt(0).toUpperCase() : 'A';
      const queueNumber = await getNextQueueNumber(appt.clinic._id || appt.clinic, prefix);
      const estWait = await estimateWaitTime(appt.clinic._id || appt.clinic);

      const qEntry = await QueueEntry.create({
        clinic: appt.clinic._id || appt.clinic,
        patient: appt.patient,
        queueNumber,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        patientType: appt.patientType,
        serviceName: appt.serviceName,
        serviceId: appt.serviceId,
        queueType: 'appointment',
        appointment: appt._id,
        status: 'waiting',
        joinedAt: new Date(),
        estimatedWaitMinutes: estWait,
      });
      appt.queueEntry = qEntry._id;
    }

    await appt.save();

    // Notify patient of status change (simplified — real app should find patient's user id)
    const statusMessages = {
      confirmed: 'Your appointment has been confirmed.',
      cancelled: 'Your appointment has been cancelled.',
      completed: 'Your appointment has been marked as completed.',
      no_show: 'Your appointment was marked as no-show.',
    };
    if (statusMessages[status]) {
      // In production: look up the patient's user record and send notification
    }

    return res.json(appt);
  } catch (err) {
    console.error('Update appointment status error:', err.message);
    return res.status(500).json({ message: 'Failed to update appointment status.' });
  }
};

// ─── Patient cancels their own appointment ────────────────────────────────────
// PUT /api/appointments/:id/cancel
const cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body;
    const patientProfile = await Patient.findOne({ user: req.user._id });
    const appt = await Appointment.findById(req.params.id);

    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });
    if (appt.patient.toString() !== patientProfile?._id.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own appointments.' });
    }
    if (['completed', 'cancelled', 'no_show'].includes(appt.status)) {
      return res.status(400).json({ message: 'This appointment cannot be cancelled.' });
    }

    appt.status = 'cancelled';
    appt.cancelledAt = new Date();
    appt.cancelledBy = 'patient';
    appt.cancellationReason = reason || '';
    await appt.save();

    return res.json({ message: 'Appointment cancelled successfully.', appointment: appt });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to cancel appointment.' });
  }
};

// ─── Get available time slots for a clinic/service/date ──────────────────────
// GET /api/appointments/available-slots?clinicId=&serviceId=&date=
const getAvailableSlots = async (req, res) => {
  try {
    const { clinicId, serviceId, date } = req.query;
    if (!clinicId || !date) {
      return res.status(400).json({ message: 'clinicId and date are required.' });
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    // Get time slots for this clinic/service
    const slotFilter = {
      clinic: clinicId,
      isActive: true,
      $or: [
        { specificDate: { $gte: dayStart, $lte: dayEnd } },
        { specificDate: null, dayOfWeek },
      ],
    };
    if (serviceId) slotFilter.serviceId = serviceId;

    const slots = await TimeSlot.find(slotFilter);

    // Check how many bookings exist for each slot
    const enriched = await Promise.all(
      slots.map(async (slot) => {
        const booked = await Appointment.countDocuments({
          clinic: clinicId,
          serviceId: slot.serviceId,
          appointmentDate: { $gte: dayStart, $lte: dayEnd },
          timeSlot: slot.label,
          status: { $nin: ['cancelled', 'no_show'] },
        });
        return {
          ...slot.toObject(),
          bookedCount: booked,
          isAvailable: booked < slot.maxPatients,
          remainingSlots: Math.max(0, slot.maxPatients - booked),
        };
      })
    );

    return res.json(enriched.filter((s) => s.isAvailable));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get available slots.' });
  }
};

// ─── Today's appointments for a clinic ───────────────────────────────────────
// GET /api/appointments/today?clinicId=
const getTodayAppointments = async (req, res) => {
  try {
    const clinicId = req.query.clinicId || req.user.clinicId;
    if (!clinicId) return res.status(400).json({ message: 'clinicId required.' });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      clinic: clinicId,
      appointmentDate: { $gte: todayStart, $lte: todayEnd },
      status: { $nin: ['cancelled'] },
    })
      .populate('patient', 'fullName phone patientType')
      .populate('staff', 'fullName position')
      .sort({ timeSlot: 1 });

    return res.json(appointments);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get today\'s appointments.' });
  }
};

// ─── TimeSlot CRUD (admin) ────────────────────────────────────────────────────

// GET /api/appointments/timeslots?clinicId=&serviceId=
const getTimeSlots = async (req, res) => {
  try {
    const { clinicId, serviceId } = req.query;
    const cId = clinicId || req.user.clinicId;
    if (!cId) return res.status(400).json({ message: 'clinicId required.' });
    const filter = { clinic: cId };
    if (serviceId) filter.serviceId = serviceId;
    const slots = await TimeSlot.find(filter).sort({ dayOfWeek: 1, startTime: 1 });
    return res.json(slots);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get time slots.' });
  }
};

// POST /api/appointments/timeslots
const createTimeSlot = async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, maxPatients, serviceId, serviceName, specificDate } = req.body;
    const clinicId = req.body.clinicId || req.user.clinicId;
    if (!clinicId || !startTime || !endTime || !serviceName) {
      return res.status(400).json({ message: 'clinicId, startTime, endTime, and serviceName are required.' });
    }

    const toLabel = (t) => {
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr   = h % 12 || 12;
      return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const slot = await TimeSlot.create({
      clinic: clinicId,
      serviceId: serviceId || null,
      serviceName,
      dayOfWeek: dayOfWeek ?? null,
      specificDate: specificDate || null,
      startTime,
      endTime,
      label: toLabel(startTime),
      maxPatients: maxPatients || 1,
    });
    return res.status(201).json(slot);
  } catch (err) {
    console.error('Create timeslot error:', err.message);
    return res.status(500).json({ message: 'Failed to create time slot.' });
  }
};

// PUT /api/appointments/timeslots/:id
const updateTimeSlot = async (req, res) => {
  try {
    const allowed = ['startTime', 'endTime', 'maxPatients', 'serviceId', 'serviceName', 'dayOfWeek', 'specificDate', 'isActive', 'label'];
    const update = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    if (update.startTime && !update.label) {
      const [h, m] = update.startTime.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      update.label = `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
    }

    const slot = await TimeSlot.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!slot) return res.status(404).json({ message: 'Time slot not found.' });
    return res.json(slot);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update time slot.' });
  }
};

// DELETE /api/appointments/timeslots/:id
const deleteTimeSlot = async (req, res) => {
  try {
    await TimeSlot.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Time slot removed.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete time slot.' });
  }
};


// GET /api/appointments/my — patient fetches their own appointments
const getMyAppointments = async (req, res) => {
  try {
    const Appointment = require('../models/Appointment');
    const mongoose    = require('mongoose');
    const appts = await Appointment.find({
      patient: new mongoose.Types.ObjectId(String(req.user._id))
    })
    .populate('clinic', 'name address city contactNumber')
    .sort({ appointmentDate: -1 });
    return res.json(appts);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch your appointments.' });
  }
};

// PUT /api/appointments/:id/cancel — patient cancels appointment
const cancelMyAppointment = async (req, res) => {
  try {
    const Appointment = require('../models/Appointment');
    const appt = await Appointment.findOneAndUpdate(
      { _id: req.params.id, patient: req.user._id },
      { status: 'cancelled', cancelReason: req.body.reason || 'Cancelled by patient' },
      { new: true }
    );
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });
    return res.json({ message: 'Appointment cancelled.', appointment: appt });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to cancel appointment.' });
  }
};

module.exports = { getMyAppointments, cancelMyAppointment,
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
};
