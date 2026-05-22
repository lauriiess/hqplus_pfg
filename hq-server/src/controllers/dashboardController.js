/**
 * Dashboard Controller — stats and metrics for the web admin panel
 */
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const Patient = require('../models/Patient');

// ─── Super Admin Dashboard ────────────────────────────────────────────────────
// GET /api/dashboard/super-admin
const getSuperAdminStats = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [
      totalClinics,
      activeClinics,
      totalUsers,
      totalPatients,
      todayQueue,
      todayAppointments,
    ] = await Promise.all([
      Clinic.countDocuments(),
      Clinic.countDocuments({ status: 'active' }),
      User.countDocuments({ isActive: true }),
      Patient.countDocuments(),
      QueueEntry.countDocuments({ joinedAt: { $gte: todayStart }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ appointmentDate: { $gte: todayStart }, status: { $ne: 'cancelled' } }),
    ]);

    // Weekly queue trend (last 7 days)
    const weeklyTrend = await getWeeklyTrend();

    return res.json({
      totalClinics,
      activeClinics,
      totalUsers,
      totalPatients,
      todayQueue,
      todayAppointments,
      weeklyTrend,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get super admin stats.' });
  }
};

// ─── Facility Admin Dashboard ─────────────────────────────────────────────────
// GET /api/dashboard/facility?clinicId=
const getFacilityStats = async (req, res) => {
  try {
    const clinicId = req.query.clinicId || req.user.clinicId;
    if (!clinicId) return res.status(400).json({ message: 'clinicId required.' });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [waiting, serving, done, noShow, pendingAppts, confirmedAppts] = await Promise.all([
      QueueEntry.countDocuments({ clinic: clinicId, status: 'waiting', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: clinicId, status: 'serving', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: clinicId, status: 'done', joinedAt: { $gte: todayStart } }),
      QueueEntry.countDocuments({ clinic: clinicId, status: 'no_show', joinedAt: { $gte: todayStart } }),
      Appointment.countDocuments({ clinic: clinicId, status: 'pending', appointmentDate: { $gte: todayStart, $lte: todayEnd } }),
      Appointment.countDocuments({ clinic: clinicId, status: 'confirmed', appointmentDate: { $gte: todayStart, $lte: todayEnd } }),
    ]);

    // Avg wait time (for done entries today)
    const avgResult = await QueueEntry.aggregate([
      { $match: { clinic: require('mongoose').Types.ObjectId.createFromHexString(clinicId.toString()), status: 'done', joinedAt: { $gte: todayStart }, actualWaitMinutes: { $ne: null } } },
      { $group: { _id: null, avgWait: { $avg: '$actualWaitMinutes' }, avgTurnaround: { $avg: '$turnaroundMinutes' } } },
    ]);
    const avgWait = avgResult.length ? Math.round(avgResult[0].avgWait) : 0;
    const avgTurnaround = avgResult.length ? Math.round(avgResult[0].avgTurnaround) : 0;

    // Peak hours (entries per hour today)
    const peakHours = await QueueEntry.aggregate([
      { $match: { clinic: require('mongoose').Types.ObjectId.createFromHexString(clinicId.toString()), joinedAt: { $gte: todayStart }, status: { $nin: ['cancelled'] } } },
      { $group: { _id: { $hour: '$joinedAt' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]);

    // Recent queue entries
    const recentQueue = await QueueEntry.find({ clinic: clinicId, joinedAt: { $gte: todayStart } })
      .sort({ joinedAt: -1 })
      .limit(10)
      .select('queueNumber patientName serviceName status joinedAt patientType');

    return res.json({
      queue: { waiting, serving, done, noShow, total: waiting + serving + done + noShow },
      appointments: { pending: pendingAppts, confirmed: confirmedAppts },
      metrics: { avgWait, avgTurnaround },
      peakHours,
      recentQueue,
    });
  } catch (err) {
    console.error('Facility stats error:', err);
    return res.status(500).json({ message: 'Failed to get facility stats.' });
  }
};

// ─── Weekly trend helper ──────────────────────────────────────────────────────
async function getWeeklyTrend() {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const count = await QueueEntry.countDocuments({ joinedAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } });
    result.push({ date: start.toISOString().split('T')[0], count });
  }
  return result;
}

module.exports = { getSuperAdminStats, getFacilityStats };
