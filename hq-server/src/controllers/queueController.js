/**
 * Queue Controller — walk-in & appointment queue management
 */
const QueueEntry = require('../models/QueueEntry');
const Clinic = require('../models/Clinic');
const Patient = require('../models/Patient');
const Notification = require('../models/Notification');
const { getNextQueueNumber, getAvgWaitTime, estimateWaitTime } = require('../utils/queueHelpers');

// ─── Get all queue entries for a clinic (today) ───────────────────────────────
// GET /api/queues?clinicId=&status=&date=
const getQueueEntries = async (req, res) => {
  try {
    const { clinicId, status, date } = req.query;

    const filter = {};
    if (clinicId) filter.clinic = clinicId;
    if (status) filter.status = status;

    // Default to today's entries
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);
    filter.joinedAt = { $gte: start, $lte: end };

    // Facility admin can only see their own clinic
    if (req.user.role === 'facility_admin' && req.user.clinicId) {
      filter.clinic = req.user.clinicId;
    }
    // Staff can only see their clinic
    if (req.user.role === 'staff' && req.user.clinicId) {
      filter.clinic = req.user.clinicId;
    }

    const entries = await QueueEntry.find(filter)
      .populate('clinic', 'name address')
      .populate('patient', 'fullName phone patientType')
      .sort({ joinedAt: 1 });

    return res.json(entries);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get queue entries.' });
  }
};

// ─── Patient joins a walk-in queue ────────────────────────────────────────────
// POST /api/queues/join
// Body: { clinicId, serviceName, serviceId?, notes? }
// Requires patient role
const joinQueue = async (req, res) => {
  try {
    const { clinicId, serviceName, serviceId, notes } = req.body;
    if (!clinicId || !serviceName) {
      return res.status(400).json({ message: 'Clinic and service are required.' });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    if (!clinic.acceptsWalkIn) {
      return res.status(400).json({ message: 'This clinic does not accept walk-in patients.' });
    }
    if (clinic.status !== 'active') {
      return res.status(400).json({ message: 'This clinic is currently not accepting patients.' });
    }

    // Check if patient is already in queue today
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const existing = await QueueEntry.findOne({
      clinic: clinicId,
      patient: req.user._id,
      status: { $in: ['waiting', 'serving'] },
      joinedAt: { $gte: todayStart },
    });
    if (existing) {
      return res.status(409).json({
        message: 'You are already in this clinic\'s queue.',
        entry: existing,
      });
    }

    // Get patient profile
    const patientProfile = await Patient.findOne({ user: req.user._id });

    // Generate queue number
    const prefix = clinic.name.charAt(0).toUpperCase();
    const queueNumber = await getNextQueueNumber(clinicId, prefix);

    // Estimate wait time
    const estWait = await estimateWaitTime(clinicId);

    // Get position
    const activeCount = await QueueEntry.countDocuments({
      clinic: clinicId,
      status: { $in: ['waiting', 'serving'] },
    });

    const entry = await QueueEntry.create({
      clinic: clinicId,
      patient: patientProfile ? patientProfile._id : null,
      queueNumber,
      patientName: req.user.fullName,
      patientPhone: req.user.phone || '',
      patientType: patientProfile ? patientProfile.patientType : 'Regular',
      serviceName,
      serviceId: serviceId || null,
      queueType: 'walk_in',
      status: 'waiting',
      joinedAt: new Date(),
      positionAtJoin: activeCount + 1,
      estimatedWaitMinutes: estWait,
      notes: notes || '',
    });

    const populated = await entry.populate('clinic', 'name address');

    // Notify the patient
    await Notification.create({
      user: req.user._id,
      title: 'Queue Joined',
      message: `You have joined the queue at ${clinic.name}. Your number is ${queueNumber}. Estimated wait: ${estWait} min.`,
      type: 'queue',
      refType: 'QueueEntry',
      refId: entry._id,
    });

    return res.status(201).json({ entry: populated, queueNumber, estimatedWaitMinutes: estWait, position: activeCount + 1 });
  } catch (err) {
    console.error('Join queue error:', err.message);
    return res.status(500).json({ message: 'Failed to join queue. Please try again.' });
  }
};

// ─── Get patient's current queue status ──────────────────────────────────────
// GET /api/queues/my-status
const getMyQueueStatus = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const patientProfile = await Patient.findOne({ user: req.user._id });

    const entries = await QueueEntry.find({
      $or: [
        { patient: patientProfile?._id },
      ],
      joinedAt: { $gte: todayStart },
      status: { $in: ['waiting', 'serving'] },
    }).populate('clinic', 'name address contactNumber');

    if (!entries.length) {
      return res.json({ active: false, entries: [] });
    }

    // Add position ahead for each entry
    const enriched = await Promise.all(
      entries.map(async (e) => {
        const ahead = await QueueEntry.countDocuments({
          clinic: e.clinic._id,
          status: 'waiting',
          joinedAt: { $lt: e.joinedAt },
        });
        return { ...e.toObject(), patientsAhead: ahead };
      })
    );

    return res.json({ active: true, entries: enriched });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get queue status.' });
  }
};

// ─── Call next patient (staff) ────────────────────────────────────────────────
// PUT /api/queues/:id/call
const callPatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id).populate('clinic', 'name');
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    if (entry.status !== 'waiting') {
      return res.status(400).json({ message: `Cannot call a patient with status: ${entry.status}` });
    }

    entry.status = 'serving';
    entry.calledAt = new Date();
    entry.gracePeriodStart = new Date();
    await entry.save();

    // Notify patient
    await Notification.create({
      user: req.user._id, // ideally this should be patient's user id
      title: 'Your Turn!',
      message: `Queue ${entry.queueNumber} — please proceed to the consultation area at ${entry.clinic?.name}.`,
      type: 'queue',
      refType: 'QueueEntry',
      refId: entry._id,
    });

    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to call patient.' });
  }
};

// ─── Complete a queue entry (staff) ──────────────────────────────────────────
// PUT /api/queues/:id/complete
const completePatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    if (!['serving', 'waiting'].includes(entry.status)) {
      return res.status(400).json({ message: `Cannot complete entry with status: ${entry.status}` });
    }
    entry.status = 'done';
    if (!entry.servedAt) entry.servedAt = new Date();
    await entry.save();
    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to complete entry.' });
  }
};

// ─── Skip / No-show ───────────────────────────────────────────────────────────
// PUT /api/queues/:id/skip
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

// PUT /api/queues/:id/no-show
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

// ─── Cancel queue entry (patient cancels their own) ──────────────────────────
// PUT /api/queues/:id/cancel
const cancelEntry = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    if (!['waiting', 'serving'].includes(entry.status)) {
      return res.status(400).json({ message: 'Cannot cancel this entry.' });
    }
    entry.status = 'cancelled';
    await entry.save();
    return res.json({ message: 'Queue entry cancelled.', entry });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to cancel entry.' });
  }
};

// ─── Queue metrics for a clinic ──────────────────────────────────────────────
// GET /api/queues/metrics?clinicId=
const getQueueMetrics = async (req, res) => {
  try {
    const { clinicId } = req.query;
    const id = clinicId || req.user.clinicId;
    if (!id) return res.status(400).json({ message: 'clinicId required.' });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [waiting, serving, done, noShow, cancelled, metrics] = await Promise.all([
      QueueEntry.countDocuments({ clinic: id, status: 'waiting', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: id, status: 'serving', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: id, status: 'done', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: id, status: 'no_show', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: id, status: 'cancelled', joinedAt: { $gte: todayStart } }),
      getAvgWaitTime(id),
    ]);

    // Peak hour data (entries per hour today)
    const peakHours = await QueueEntry.aggregate([
      {
        $match: {
          clinic: require('mongoose').Types.ObjectId.createFromHexString(id.toString()),
          joinedAt: { $gte: todayStart },
          status: { $nin: ['cancelled'] },
        },
      },
      { $group: { _id: { $hour: '$joinedAt' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]);

    return res.json({
      waiting,
      serving,
      done,
      noShow,
      cancelled,
      total: waiting + serving + done + noShow + cancelled,
      avgWaitMinutes: metrics.avgWait,
      avgTurnaroundMinutes: metrics.avgTurnaround,
      peakHours,
    });
  } catch (err) {
    console.error('Metrics error:', err.message);
    return res.status(500).json({ message: 'Failed to get queue metrics.' });
  }
};

// ─── Add walk-in patient manually (staff) ────────────────────────────────────
// POST /api/queues/add-walkin
const addWalkIn = async (req, res) => {
  try {
    const { clinicId, patientName, patientPhone, serviceName, serviceId, patientType, notes } = req.body;
    if (!clinicId || !patientName || !serviceName) {
      return res.status(400).json({ message: 'clinicId, patientName, and serviceName are required.' });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });

    const prefix = clinic.name.charAt(0).toUpperCase();
    const queueNumber = await getNextQueueNumber(clinicId, prefix);
    const estWait = await estimateWaitTime(clinicId);
    const activeCount = await QueueEntry.countDocuments({ clinic: clinicId, status: { $in: ['waiting', 'serving'] } });

    const entry = await QueueEntry.create({
      clinic: clinicId,
      queueNumber,
      patientName: patientName.trim(),
      patientPhone: patientPhone || '',
      patientType: patientType || 'Regular',
      serviceName,
      serviceId: serviceId || null,
      queueType: 'walk_in',
      status: 'waiting',
      joinedAt: new Date(),
      positionAtJoin: activeCount + 1,
      estimatedWaitMinutes: estWait,
      notes: notes || '',
    });

    return res.status(201).json({ entry, queueNumber, estimatedWaitMinutes: estWait });
  } catch (err) {
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
