/**
 * Dashboard Controller
 */
const QueueEntry  = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const Clinic      = require('../models/Clinic');
const User        = require('../models/User');
const Patient     = require('../models/Patient');

const todayRange = () => {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(); end.setHours(23,59,59,999);
  return { $gte: start, $lte: end };
};

const getWeeklyTrend = async (clinicId) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d     = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const end   = new Date(d); end.setHours(23,59,59,999);
    const label = d.toLocaleDateString('en-PH', { weekday: 'short' });
    const filter = { joinedAt: { $gte: d, $lte: end } };
    if (clinicId) filter.clinic = clinicId;
    const count = await QueueEntry.countDocuments(filter);
    days.push({ day: label, count });
  }
  return days;
};

// GET /api/dashboard/super-admin
const getSuperAdminStats = async (req, res) => {
  try {
    const [
      totalClinics, activeClinics,
      totalUsers, totalPatients,
      todayQueue, todayAppointments,
    ] = await Promise.all([
      Clinic.countDocuments({ isActive: true }),
      Clinic.countDocuments({ isActive: true, status: { $in: ['open','busy','active'] } }),
      User.countDocuments({ isActive: true }),
      Patient.countDocuments(),
      QueueEntry.countDocuments({ joinedAt: todayRange(), status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ appointmentDate: todayRange(), status: { $ne: 'cancelled' } }),
    ]);

    const weeklyTrend = await getWeeklyTrend(null);

    // Status breakdown for bar chart
    const statusGroups = await QueueEntry.aggregate([
      { $match: { joinedAt: todayRange() } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusBreakdown = statusGroups.map(g => ({ status: g._id, count: g.count }));

    return res.json({
      totalClinics, activeClinics, totalUsers, totalPatients,
      todayQueue, todayAppointments, weeklyTrend, statusBreakdown,
    });
  } catch (err) {
    console.error('getSuperAdminStats:', err.message);
    return res.status(500).json({ message: 'Failed to load dashboard stats.' });
  }
};

// GET /api/dashboard/facility
const getFacilityStats = async (req, res) => {
  try {
    const clinicId  = req.query.clinicId || req.user.clinicId;
    const qFilter   = { joinedAt: todayRange() };
    if (clinicId) qFilter.clinic = clinicId;

    const [todayEntries, completedCount, servingCount, waitingCount] = await Promise.all([
      QueueEntry.find(qFilter).sort({ joinedAt: 1 }),
      QueueEntry.countDocuments({ ...qFilter, status: { $in: ['done','completed'] } }),
      QueueEntry.countDocuments({ ...qFilter, status: 'serving' }),
      QueueEntry.countDocuments({ ...qFilter, status: 'waiting' }),
    ]);

    // Avg wait time from calledAt - joinedAt
    const withTimes = todayEntries.filter(e => e.calledAt && e.joinedAt);
    const avgWait = withTimes.length
      ? Math.round(withTimes.reduce((s,e) => s + (new Date(e.calledAt) - new Date(e.joinedAt)) / 60000, 0) / withTimes.length)
      : 0;

    // Queue by service
    const serviceMap = {};
    todayEntries.forEach(e => {
      const k = e.serviceName || 'Other';
      serviceMap[k] = (serviceMap[k] || 0) + 1;
    });
    const queueByService = Object.entries(serviceMap).map(([name, count]) => ({ name, count }));

    // Weekly trend
    const weeklyTrend = await getWeeklyTrend(clinicId);

    // Recent activity (last 10 entries, newest first)
    const recentActivity = [...todayEntries].reverse().slice(0, 10).map(e => ({
      queueNumber: e.queueNumber,
      patientName: e.patientName,
      serviceName: e.serviceName,
      status:      e.status,
      time:        new Date(e.joinedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
    }));

    return res.json({
      todayPatients:  todayEntries.length,
      activeQueue:    waitingCount + servingCount,
      avgWaitTime:    avgWait,
      completedToday: completedCount,
      queueByService,
      weeklyTrend,
      recentActivity,
    });
  } catch (err) {
    console.error('getFacilityStats:', err.message);
    return res.status(500).json({ message: 'Failed to load facility stats.' });
  }
};

module.exports = { getSuperAdminStats, getFacilityStats };
