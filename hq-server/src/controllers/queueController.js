/**
 * Queue Controller — walk-in & appointment queue management
 */
const QueueEntry   = require('../models/QueueEntry');
const Clinic       = require('../models/Clinic');
const Patient      = require('../models/Patient');
const Notification = require('../models/Notification');
const { getNextQueueNumber, getAvgWaitTime, estimateWaitTime, toObjectId } = require('../utils/queueHelpers');

// ─── Get all queue entries (today) ────────────────────────────────────────────
const getQueueEntries = async (req, res) => {
  try {
    const { clinicId, status, date } = req.query;
    const filter = {};

    // Scope by role
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

// ─── Patient joins a walk-in queue ────────────────────────────────────────────
const joinQueue = async (req, res) => {
  try {
    const { clinicId, serviceName, serviceId, notes } = req.body;
    if (!clinicId || !serviceName) return res.status(400).json({ message: 'Clinic and service are required.' });

    const clinic = await Clinic.findById(clinicId);
    if (!clinic)                   return res.status(404).json({ message: 'Clinic not found.' });
    if (!clinic.acceptsWalkIn)     return res.status(400).json({ message: 'This clinic does not accept walk-in patients.' });
    if (clinic.status !== 'active') return res.status(400).json({ message: 'This clinic is currently not accepting patients.' });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const existing = await QueueEntry.findOne({ clinic: clinicId, patient: req.user._id, status: { $in: ['waiting', 'serving'] }, joinedAt: { $gte: todayStart } });
    if (existing) return res.status(409).json({ message: "You are already in this clinic's queue.", entry: existing });

    const patientProfile = await Patient.findOne({ user: req.user._id });
    const prefix      = clinic.name.charAt(0).toUpperCase();
    const queueNumber = await getNextQueueNumber(clinicId, prefix);
    const estWait     = await estimateWaitTime(clinicId);
    const activeCount = await QueueEntry.countDocuments({ clinic: clinicId, status: { $in: ['waiting', 'serving'] } });

    const entry = await QueueEntry.create({
      clinic: clinicId,
      patient: patientProfile ? patientProfile._id : null,
      queueNumber,
      patientName:  req.user.fullName,
      patientPhone: req.user.phone || '',
      patientType:  patientProfile ? patientProfile.patientType : 'Regular',
      serviceName,
      serviceId:    serviceId || null,
      queueType:    'walk_in',
      status:       'waiting',
      joinedAt:     new Date(),
      positionAtJoin: activeCount + 1,
      estimatedWaitMinutes: estWait,
      notes: notes || '',
    });

    const populated = await entry.populate('clinic', 'name address');

    await Notification.create({
      user: req.user._id,
      title: 'Queue Joined',
      message: `You have joined the queue at ${clinic.name}. Your number is ${queueNumber}. Estimated wait: ${estWait} min.`,
      type: 'queue', refType: 'QueueEntry', refId: entry._id,
    });

    return res.status(201).json({ entry: populated, queueNumber, estimatedWaitMinutes: estWait, position: activeCount + 1 });
  } catch (err) {
    console.error('Join queue error:', err.message);
    return res.status(500).json({ message: 'Failed to join queue. Please try again.' });
  }
};

// ─── Get patient's current queue status ──────────────────────────────────────
const getMyQueueStatus = async (req, res) => {
  try {
    const todayStart     = new Date(); todayStart.setHours(0, 0, 0, 0);
    const patientProfile = await Patient.findOne({ user: req.user._id });

    const entries = await QueueEntry.find({
      patient: patientProfile?._id,
      joinedAt: { $gte: todayStart },
      status: { $in: ['waiting', 'serving'] },
    }).populate('clinic', 'name address contactNumber');

    if (!entries.length) return res.json({ active: false, entries: [] });

    const enriched = await Promise.all(entries.map(async (e) => {
      const ahead = await QueueEntry.countDocuments({ clinic: e.clinic._id, status: 'waiting', joinedAt: { $lt: e.joinedAt } });
      return { ...e.toObject(), patientsAhead: ahead };
    }));

    return res.json({ active: true, entries: enriched });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get queue status.' });
  }
};

// ─── Call next patient (staff) ────────────────────────────────────────────────
const callPatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id).populate('clinic', 'name');
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    if (entry.status !== 'waiting') return res.status(400).json({ message: `Cannot call a patient with status: ${entry.status}` });

    entry.status = 'serving';
    entry.calledAt = new Date();
    entry.gracePeriodStart = new Date();
    await entry.save();
    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to call patient.' });
  }
};

// ─── Complete ─────────────────────────────────────────────────────────────────
const completePatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    if (!['serving', 'waiting'].includes(entry.status)) return res.status(400).json({ message: `Cannot complete entry with status: ${entry.status}` });
    entry.status = 'done';
    if (!entry.servedAt) entry.servedAt = new Date();
    await entry.save();
    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to complete entry.' });
  }
};

// ─── Skip ─────────────────────────────────────────────────────────────────────
const skipPatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    entry.status = 'skipped';
    await entry.save();
    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to skip patient.' });
  }
};

// ─── No-show ──────────────────────────────────────────────────────────────────
const markNoShow = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    entry.status = 'no_show';
    await entry.save();
    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mark no-show.' });
  }
};

// ─── Cancel ───────────────────────────────────────────────────────────────────
const cancelEntry = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    if (!['waiting', 'serving'].includes(entry.status)) return res.status(400).json({ message: 'Cannot cancel this entry.' });
    entry.status = 'cancelled';
    await entry.save();
    return res.json({ message: 'Queue entry cancelled.', entry });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to cancel entry.' });
  }
};

// ─── Queue Metrics ────────────────────────────────────────────────────────────
const getQueueMetrics = async (req, res) => {
  try {
    const { clinicId } = req.query;
    const id = clinicId || req.user.clinicId;
    if (!id) return res.status(400).json({ message: 'clinicId required.' });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const clinicOid  = toObjectId(id);

    const [waiting, serving, done, noShow, cancelled, metrics] = await Promise.all([
      QueueEntry.countDocuments({ clinic: id, status: 'waiting',   joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: id, status: 'serving',   joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: id, status: 'done',      joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: id, status: 'no_show',   joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: id, status: 'cancelled', joinedAt: { $gte: todayStart } }),
      getAvgWaitTime(id),
    ]);

    const peakHours = await QueueEntry.aggregate([
      {
        $match: {
          clinic:   clinicOid,
          joinedAt: { $gte: todayStart },
          status:   { $nin: ['cancelled'] },
        },
      },
      { $group: { _id: { $hour: '$joinedAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      waiting, serving, done, noShow, cancelled,
      total: waiting + serving + done + noShow + cancelled,
      avgWaitMinutes:       metrics.avgWait,
      avgTurnaroundMinutes: metrics.avgTurnaround,
      peakHours,
    });
  } catch (err) {
    console.error('Metrics error:', err.message);
    return res.status(500).json({ message: 'Failed to get queue metrics.' });
  }
};

// ─── Add walk-in manually (staff) ─────────────────────────────────────────────
const addWalkIn = async (req, res) => {
  try {
    const { patientName, patientPhone, patientType, serviceName, serviceId, notes } = req.body;
    const clinicId = req.body.clinicId || req.user.clinicId;

    if (!clinicId || !patientName || !serviceName) {
      return res.status(400).json({ message: 'clinicId, patientName, and serviceName are required.' });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });

    const prefix      = clinic.name.charAt(0).toUpperCase();
    const queueNumber = await getNextQueueNumber(clinicId, prefix);
    const estWait     = await estimateWaitTime(clinicId);
    const activeCount = await QueueEntry.countDocuments({ clinic: clinicId, status: { $in: ['waiting', 'serving'] } });

    const entry = await QueueEntry.create({
      clinic: clinicId,
      patient: null,
      queueNumber,
      patientName:  patientName.trim(),
      patientPhone: patientPhone || '',
      patientType:  patientType || 'Regular',
      serviceName,
      serviceId:    serviceId || null,
      queueType:    'walk_in',
      status:       'waiting',
      joinedAt:     new Date(),
      positionAtJoin: activeCount + 1,
      estimatedWaitMinutes: estWait,
      notes: notes || '',
    });

    return res.status(201).json({ entry, queueNumber, estimatedWaitMinutes: estWait });
  } catch (err) {
    console.error('Add walk-in error:', err.message);
    return res.status(500).json({ message: 'Failed to add walk-in patient.' });
  }
};

module.exports = {
  getQueueEntries,
  joinQueue,
  getMyQueueStatus,
  callPatient,
  completePatient,
  skipPatient,
  markNoShow,
  cancelEntry,
  getQueueMetrics,
  addWalkIn,
};
