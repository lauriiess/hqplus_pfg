
const Appointment = require('../models/Appointment');
const Clinic      = require('../models/Clinic');
const Patient     = require('../models/Patient');
const TimeSlot    = require('../models/TimeSlot');
const Notification = require('../models/Notification');

const bookAppointment = async (req, res) => {
  try {
    const { clinicId, serviceName, serviceId, staffId, appointmentDate, timeSlot, endTime, reason, notes } = req.body;
    if (!clinicId || !serviceName || !appointmentDate || !timeSlot) {
      return res.status(400).json({ message: 'clinicId, serviceName, appointmentDate, and timeSlot are required.' });
    }
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    if (clinic.status === 'closed') return res.status(400).json({ message: 'This clinic is currently closed.' });

    let patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) {
      patientProfile = await Patient.create({
        user: req.user._id,
        fullName: req.user.fullName,
        email:    req.user.email,
        phone:    req.user.phone || '',
        patientType: 'Regular',
      });
    }

    const apptDate = new Date(appointmentDate);
    const dayStart = new Date(apptDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(apptDate); dayEnd.setHours(23, 59, 59, 999);

    const existing = await Appointment.findOne({
      clinic: clinicId,
      patient: patientProfile._id,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      timeSlot,
      status: { $nin: ['cancelled', 'no_show'] },
    });
    if (existing) return res.status(409).json({ message: 'You already have an appointment at this clinic for this time slot.' });

    const appointment = await Appointment.create({
      clinic:          clinicId,
      patient:         patientProfile._id,
      staff:           staffId || null,
      serviceName,
      serviceId:       serviceId || null,
      appointmentDate: apptDate,
      timeSlot,
      endTime:         endTime || '',
      patientName:     patientProfile.fullName || req.user.fullName,
      patientPhone:    patientProfile.phone || req.user.phone || '',
      reason:          reason || '',
      notes:           notes || '',
      status:          'scheduled',
    });

    const pop = await appointment.populate('clinic', 'name address contactNumber');

    return res.status(201).json({
      message: 'Appointment booked successfully.',
      appointment: {
        _id:             appointment._id,
        clinicName:      clinic.name,
        clinicAddress:   clinic.address,
        serviceName,
        appointmentDate: appointment.appointmentDate,
        timeSlot,
        status:          'scheduled',
      },
    });
  } catch (err) {
    console.error('bookAppointment error:', err.message);
    return res.status(500).json({ message: 'Failed to book appointment.' });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    let patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) return res.json([]);
    const appts = await Appointment.find({ patient: patientProfile._id })
      .populate('clinic', 'name address contactNumber')
      .sort({ appointmentDate: -1 });
    return res.json(appts);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get appointments.' });
  }
};

const getAppointments = async (req, res) => {
  try {
    const { clinicId, status, date } = req.query;
    const filter = {};
    if (req.user.role === 'facility_admin' && req.user.clinicId) filter.clinic = req.user.clinicId;
    else if (clinicId) filter.clinic = clinicId;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0,0,0,0);
      const end   = new Date(d); end.setHours(23,59,59,999);
      filter.appointmentDate = { $gte: start, $lte: end };
    }
    const appts = await Appointment.find(filter)
      .populate('clinic', 'name address')
      .populate('patient', 'fullName phone')
      .sort({ appointmentDate: 1 });
    return res.json(appts);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get appointments.' });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });
    appt.status = 'cancelled';
    appt.cancellationReason = req.body.reason || 'Cancelled by patient';
    await appt.save();
    return res.json({ message: 'Appointment cancelled.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to cancel.' });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!appt) return res.status(404).json({ message: 'Not found.' });
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update.' });
  }
};

const getAvailableTimeSlots = async (req, res) => {
  try {
    const { clinicId, serviceId, date } = req.query;
    const slots = ['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
                   '11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
                   '3:00 PM','3:30 PM','4:00 PM','4:30 PM'];
    if (!clinicId || !date) return res.json(slots);
    const d = new Date(date);
    const start = new Date(d); start.setHours(0,0,0,0);
    const end   = new Date(d); end.setHours(23,59,59,999);
    const booked = await Appointment.find({ clinic: clinicId, appointmentDate: { $gte: start, $lte: end }, status: { $nin: ['cancelled','no_show'] } }).select('timeSlot');
    const bookedSlots = booked.map(a => a.timeSlot);
    const available = slots.filter(s => bookedSlots.filter(b => b === s).length < 3);
    return res.json(available);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get time slots.' });
  }
};

module.exports = { bookAppointment, getMyAppointments, getAppointments, cancelAppointment, updateAppointment, getAvailableTimeSlots };
