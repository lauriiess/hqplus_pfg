/**
 * Dashboard Controller — stats and metrics for the web admin panel
 */
const QueueEntry  = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const Clinic      = require('../models/Clinic');
const User        = require('../models/User');
const Patient     = require('../models/Patient');

// ─── Super Admin Dashboard ────────────────────────────────────────────────────
const getSuperAdminStats = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);

    const [totalClinics, activeClinics, totalUsers, totalPatients, todayQueue, todayAppointments] = await Promise.all([
      Clinic.countDocuments(),
      Clinic.countDocuments({ status: { $in: ['open','busy'] } }),
      User.countDocuments({ isActive: true }),
      Patient.countDocuments(),
      QueueEntry.countDocuments({ joinedAt: { $gte: todayStart }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ appointmentDate: { $gte: todayStart }, status: { $ne: 'cancelled' } }),
    ]);

    const weeklyTrend = await getWeeklyTrend();

    return res.json({ totalClinics, activeClinics, totalUsers, totalPatients, todayQueue, todayAppointments, weeklyTrend });
  } catch (err) {
    console.error('Super admin stats error:', err);
    return res.status(500).json({ message: 'Failed to load dashboard stats.' });
  }
};

// ─── Facility Admin Dashboard ─────────────────────────────────────────────────
const getFacilityStats = async (req, res) => {
  try {
    const clinicId = req.query.clinicId || req.user.clinicId;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

    const qFilter = { joinedAt: { $gte: todayStart, $lte: todayEnd } };
    if (clinicId) qFilter.clinic = clinicId;

    const [todayEntries, completedCount, servingCount, waitingCount] = await Promise.all([
      QueueEntry.find(qFilter).populate('patient', 'fullName phone patientType').sort({ joinedAt: 1 }),
      QueueEntry.countDocuments({ ...qFilter, status: { $in: ['done','completed'] } }),
      QueueEntry.countDocuments({ ...qFilter, status: 'serving' }),
      QueueEntry.countDocuments({ ...qFilter, status: 'waiting' }),
    ]);

    // Avg wait time (completed entries only)
    const completedEntries = todayEntries.filter(e => ['done','completed'].includes(e.status) && e.calledAt && e.joinedAt);
    const avgWait = completedEntries.length
      ? Math.round(completedEntries.reduce((s,e) => s + (new Date(e.calledAt) - new Date(e.joinedAt)) / 60000, 0) / completedEntries.length)
      : 0;

    // Queue by service
    const serviceMap = {};
    todayEntries.forEach(e => {
      const k = e.serviceName || 'Other';
      serviceMap[k] = (serviceMap[k] || 0) + 1;
    });
    const queueByService = Object.entries(serviceMap).map(([name, count]) => ({ name, count }));

    // Weekly trend (last 7 days)
    const weeklyTrend = await getWeeklyTrend(clinicId);

    // Recent activity (last 10 entries)
    const recentActivity = todayEntries.slice(-10).reverse().map(e => ({
      queueNumber: e.queueNumber,
      patientName: e.patientName,
      serviceName: e.serviceName,
      status:      e.status,
      time:        new Date(e.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return res.json({
      todayPatients:   todayEntries.length,
      activeQueue:     waitingCount + servingCount,
      completedToday:  completedCount,
      avgWaitTime:     avgWait,
      queueByService,
      weeklyTrend,
      recentActivity,
      completionRate:  todayEntries.length ? Math.round((completedCount / todayEntries.length) * 100) : 0,
    });
  } catch (err) {
    console.error('Facility stats error:', err);
    return res.status(500).json({ message: 'Failed to load facility stats.' });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getWeeklyTrend(clinicId) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const results = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d); start.setHours(0,0,0,0);
    const end   = new Date(d); end.setHours(23,59,59,999);
    const filter = { joinedAt: { $gte: start, $lte: end } };
    if (clinicId) filter.clinic = clinicId;
    const count = await QueueEntry.countDocuments(filter);
    results.push({ day: days[d.getDay()], count });
  }
  return results;
}

module.exports = { getSuperAdminStats, getFacilityStats };
