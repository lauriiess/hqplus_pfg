
const QueueEntry   = require('../models/QueueEntry');
const Clinic       = require('../models/Clinic');
const Patient      = require('../models/Patient');
const Notification = require('../models/Notification');
const { getNextQueueNumber, getAvgWaitTime, estimateWaitTime, toObjectId } = require('../utils/queueHelpers');

const getQueueEntries = async (req, res) => {
  try {
    const { clinicId, status, date } = req.query;
    const filter = {};
    if (req.user.role === 'facility_admin' && req.user.clinicId) filter.clinic = req.user.clinicId;
    else if (req.user.role === 'staff' && req.user.clinicId)     filter.clinic = req.user.clinicId;
    else if (clinicId)                                            filter.clinic = clinicId;
    if (status) filter.status = status;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(targetDate); end.setHours(23, 59, 59, 999);
    filter.joinedAt = { $gte: start, $lte: end };
    const entries = await QueueEntry.find(filter)
      .populate('clinic', 'name address')
      .populate('patient', 'fullName phone patientType')
      .sort({ joinedAt: 1 });
    return res.json(entries);
  } catch (err) {
    console.error('getQueueEntries error:', err.message);
    return res.status(500).json({ message: 'Failed to get queue entries.' });
  }
};

const joinQueue = async (req, res) => {
  try {
    const { clinicId, serviceName, serviceId, notes, priority } = req.body;
    if (!clinicId || !serviceName) return res.status(400).json({ message: 'Clinic and service are required.' });

    const clinic = await Clinic.findById(clinicId);
    if (!clinic)                        return res.status(404).json({ message: 'Clinic not found.' });
    if (clinic.status === 'closed')     return res.status(400).json({ message: 'This clinic is currently closed.' });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const existing = await QueueEntry.findOne({
      clinic: clinicId,
      patient: req.user._id,
      status: { $in: ['waiting', 'serving'] },
      joinedAt: { $gte: todayStart },
    });
    if (existing) return res.status(409).json({ message: "You are already in this clinic's queue.", entry: existing });

    const patientProfile = await Patient.findOne({ user: req.user._id });
    const prefix      = clinic.name.charAt(0).toUpperCase();
    const queueNumber = await getNextQueueNumber(clinicId, prefix);
    const estWait     = await estimateWaitTime(clinicId);
    const activeCount = await QueueEntry.countDocuments({ clinic: clinicId, status: { $in: ['waiting', 'serving'] } });

    const entry = await QueueEntry.create({
      clinic:       clinicId,
      patient:      req.user._id,
      patientProfile: patientProfile?._id || null,
      serviceName,
      serviceId:    serviceId || null,
      queueNumber,
      status:       'waiting',
      priority:     priority || false,
      notes:        notes || '',
      estimatedWaitTime: estWait,
      peopleAhead:  activeCount,
      joinedAt:     new Date(),
    });

    const populated = await entry.populate('clinic', 'name address contactNumber');

    return res.status(201).json({
      message: 'Joined queue successfully.',
      entry: {
        _id: entry._id,
        ticketNumber: queueNumber,
        clinicName:   clinic.name,
        clinicAddress: clinic.address,
        serviceName,
        status:       'waiting',
        estimatedWaitTime: estWait,
        peopleAhead:  activeCount,
        joinedAt:     entry.joinedAt,
      },
    });
  } catch (err) {
    console.error('joinQueue error:', err.message);
    return res.status(500).json({ message: 'Failed to join queue.' });
  }
};

const getMyQueueStatus = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const entry = await QueueEntry.findOne({
      patient: req.user._id,
      status:  { $in: ['waiting', 'serving'] },
      joinedAt: { $gte: todayStart },
    }).populate('clinic', 'name address contactNumber').sort({ joinedAt: -1 });

    if (!entry) return res.json({ active: false, entry: null });

    const activeCount = await QueueEntry.countDocuments({ clinic: entry.clinic._id, status: { $in: ['waiting', 'serving'] }, joinedAt: { $gte: todayStart } });

    return res.json({
      active: true,
      entry: {
        _id:              entry._id,
        ticketNumber:     entry.queueNumber,
        clinicName:       entry.clinic?.name || '',
        clinicAddress:    entry.clinic?.address || '',
        serviceName:      entry.serviceName,
        status:           entry.status,
        estimatedWaitTime: entry.estimatedWaitTime || 0,
        peopleAhead:      Math.max(0, activeCount - 1),
        joinedAt:         entry.joinedAt,
      },
    });
  } catch (err) {
    console.error('getMyQueueStatus error:', err.message);
    return res.status(500).json({ message: 'Failed to get queue status.' });
  }
};

const cancelQueue = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    if (entry.patient.toString() !== req.user._id.toString() && !['facility_admin','super_admin','staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    entry.status = 'cancelled';
    await entry.save();
    return res.json({ message: 'Removed from queue.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to cancel queue.' });
  }
};

const getQueueStats = async (req, res) => {
  try {
    const { clinicId } = req.query;
    const targetClinicId = clinicId || req.user.clinicId;
    if (!targetClinicId) return res.status(400).json({ message: 'clinicId required.' });
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [waiting, serving, completed, total] = await Promise.all([
      QueueEntry.countDocuments({ clinic: targetClinicId, status: 'waiting', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: targetClinicId, status: 'serving', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: targetClinicId, status: 'completed', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: targetClinicId, joinedAt: { $gte: todayStart } }),
    ]);
    return res.json({ waiting, serving, completed, total, avgWait: await getAvgWaitTime(targetClinicId) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get stats.' });
  }
};

const updateQueueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!entry) return res.status(404).json({ message: 'Not found.' });
    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update.' });
  }
};

module.exports = { getQueueEntries, joinQueue, getMyQueueStatus, cancelQueue, getQueueStats, updateQueueStatus };
