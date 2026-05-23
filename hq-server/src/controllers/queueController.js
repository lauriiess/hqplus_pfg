
const QueueEntry = require('../models/QueueEntry');
const Clinic     = require('../models/Clinic');
const Patient    = require('../models/Patient');
const { getNextQueueNumber, getAvgWaitTime, estimateWaitTime } = require('../utils/queueHelpers');

const getQueueEntries = async (req, res) => {
  try {
    const { clinicId, status, date } = req.query;
    const filter = {};
    if (req.user.role === 'facility_admin' && req.user.clinicId) filter.clinic = req.user.clinicId;
    else if (req.user.role === 'staff' && req.user.clinicId)     filter.clinic = req.user.clinicId;
    else if (clinicId) filter.clinic = clinicId;
    if (status) filter.status = status;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0,0,0,0);
    const end   = new Date(targetDate); end.setHours(23,59,59,999);
    filter.joinedAt = { $gte: start, $lte: end };
    const entries = await QueueEntry.find(filter)
      .populate('clinic', 'name address')
      .populate('patient', 'fullName phone patientType')
      .sort({ joinedAt: 1 });
    return res.json(entries);
  } catch (err) {
    console.error('getQueueEntries:', err.message);
    return res.status(500).json({ message: 'Failed to get queue entries.' });
  }
};

const joinQueue = async (req, res) => {
  try {
    const { clinicId, serviceName, serviceId, notes, priority } = req.body;
    if (!clinicId || !serviceName)
      return res.status(400).json({ message: 'Clinic and service are required.' });

    const clinic = await Clinic.findById(clinicId);
    if (!clinic)                    return res.status(404).json({ message: 'Clinic not found.' });
    if (clinic.status === 'closed') return res.status(400).json({ message: 'This clinic is currently closed.' });

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const existing = await QueueEntry.findOne({
      clinic: clinicId, patient: req.user._id,
      status: { $in: ['waiting','serving'] }, joinedAt: { $gte: todayStart },
    });
    if (existing)
      return res.status(409).json({ message: "You are already in this clinic's queue." });

    // Auto-create or fetch patient profile
    let patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      patient = await Patient.create({
        user: req.user._id,
        fullName: req.user.fullName || 'Patient',
        email: req.user.email || '',
        phone: req.user.phone || '',
        patientType: 'Regular',
      });
    }

    const prefix      = clinic.name.charAt(0).toUpperCase();
    const queueNumber = await getNextQueueNumber(clinicId, prefix);
    const estWait     = await estimateWaitTime(clinicId);
    const activeCount = await QueueEntry.countDocuments({ clinic: clinicId, status: { $in: ['waiting','serving'] } });

    const entry = await QueueEntry.create({
      clinic:       clinicId,
      patient:      req.user._id,
      patientName:  patient.fullName || req.user.fullName || 'Patient',
      patientPhone: patient.phone || req.user.phone || '',
      patientType:  patient.patientType || 'Regular',
      serviceName,
      serviceId:    serviceId || null,
      queueNumber,
      status:       'waiting',
      priority:     priority || false,
      notes:        notes || '',
      estimatedWaitMinutes: estWait,
      positionAtJoin: activeCount + 1,
      joinedAt:     new Date(),
    });

    return res.status(201).json({
      message: 'Joined queue successfully.',
      entry: {
        _id:              entry._id,
        ticketNumber:     queueNumber,
        clinicName:       clinic.name,
        clinicAddress:    clinic.address,
        serviceName,
        status:           'waiting',
        estimatedWaitTime: estWait,
        peopleAhead:      activeCount,
        joinedAt:         entry.joinedAt,
      },
    });
  } catch (err) {
    console.error('joinQueue error:', err.message);
    return res.status(500).json({ message: 'Failed to join queue: ' + err.message });
  }
};

const getMyQueueStatus = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const entry = await QueueEntry.findOne({
      patient: req.user._id,
      status:  { $in: ['waiting','serving'] },
      joinedAt: { $gte: todayStart },
    }).populate('clinic', 'name address contactNumber').sort({ joinedAt: -1 });

    if (!entry) return res.json({ active: false, entry: null });

    const activeCount = await QueueEntry.countDocuments({
      clinic: entry.clinic._id,
      status: { $in: ['waiting','serving'] },
      joinedAt: { $gte: todayStart },
    });

    return res.json({
      active: true,
      entry: {
        _id:              entry._id,
        ticketNumber:     entry.queueNumber,
        clinicName:       entry.clinic?.name || '',
        clinicAddress:    entry.clinic?.address || '',
        serviceName:      entry.serviceName,
        status:           entry.status,
        estimatedWaitTime: entry.estimatedWaitMinutes || 0,
        peopleAhead:      Math.max(0, activeCount - 1),
        joinedAt:         entry.joinedAt,
      },
    });
  } catch (err) {
    console.error('getMyQueueStatus:', err.message);
    return res.status(500).json({ message: 'Failed to get queue status.' });
  }
};

const callPatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id,
      { status: 'serving', calledAt: new Date() }, { new: true });
    if (!entry) return res.status(404).json({ message: 'Not found.' });
    return res.json({ message: 'Patient called.', entry });
  } catch (err) { return res.status(500).json({ message: 'Failed.' }); }
};

const completePatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id,
      { status: 'done', doneAt: new Date() }, { new: true });
    if (!entry) return res.status(404).json({ message: 'Not found.' });
    return res.json({ message: 'Completed.', entry });
  } catch (err) { return res.status(500).json({ message: 'Failed.' }); }
};

const skipPatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id,
      { status: 'skipped' }, { new: true });
    if (!entry) return res.status(404).json({ message: 'Not found.' });
    return res.json({ message: 'Skipped.', entry });
  } catch (err) { return res.status(500).json({ message: 'Failed.' }); }
};

const markNoShow = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id,
      { status: 'no_show', doneAt: new Date() }, { new: true });
    if (!entry) return res.status(404).json({ message: 'Not found.' });
    return res.json({ message: 'Marked no-show.', entry });
  } catch (err) { return res.status(500).json({ message: 'Failed.' }); }
};

const cancelEntry = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Not found.' });
    const isOwner = entry.patient?.toString() === req.user._id.toString();
    const isStaff = ['staff','facility_admin','super_admin'].includes(req.user.role);
    if (!isOwner && !isStaff) return res.status(403).json({ message: 'Not authorized.' });
    entry.status = 'cancelled';
    await entry.save();
    return res.json({ message: 'Removed from queue.' });
  } catch (err) { return res.status(500).json({ message: 'Failed.' }); }
};

const addWalkIn = async (req, res) => {
  try {
    const { clinicId, serviceName, patientName, patientPhone, priority, notes } = req.body;
    if (!clinicId || !serviceName || !patientName)
      return res.status(400).json({ message: 'clinicId, serviceName, and patientName are required.' });
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    const prefix      = clinic.name.charAt(0).toUpperCase();
    const queueNumber = await getNextQueueNumber(clinicId, prefix);
    const estWait     = await estimateWaitTime(clinicId);
    const activeCount = await QueueEntry.countDocuments({ clinic: clinicId, status: { $in: ['waiting','serving'] } });
    const entry = await QueueEntry.create({
      clinic: clinicId, patient: null,
      patientName, patientPhone: patientPhone || '',
      serviceName, queueNumber, status: 'waiting',
      priority: priority || false, notes: notes || '',
      estimatedWaitMinutes: estWait, positionAtJoin: activeCount + 1,
      joinedAt: new Date(),
    });
    return res.status(201).json({ message: 'Walk-in added.', entry });
  } catch (err) {
    console.error('addWalkIn:', err.message);
    return res.status(500).json({ message: 'Failed: ' + err.message });
  }
};

const getQueueMetrics = async (req, res) => {
  try {
    const { clinicId } = req.query;
    const targetId = clinicId || req.user.clinicId;
    if (!targetId) return res.status(400).json({ message: 'clinicId required.' });
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const [waiting, serving, completed, total] = await Promise.all([
      QueueEntry.countDocuments({ clinic: targetId, status: 'waiting',   joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: targetId, status: 'serving',   joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: targetId, status: 'done',      joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: targetId,                       joinedAt: { $gte: todayStart } }),
    ]);
    return res.json({ waiting, serving, completed, total, avgWait: await getAvgWaitTime(targetId) });
  } catch (err) { return res.status(500).json({ message: 'Failed.' }); }
};

module.exports = {
  getQueueEntries, joinQueue, getMyQueueStatus,
  callPatient, completePatient, skipPatient, markNoShow,
  cancelEntry, addWalkIn, getQueueMetrics,
};
