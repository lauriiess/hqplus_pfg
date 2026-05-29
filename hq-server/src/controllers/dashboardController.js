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
      QueueEntry.countDocuments({ createdAt: { $gte: todayStart }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ appointmentDate: { $gte: todayStart }, status: { $ne: 'cancelled' } }),
    ]);

    const weeklyTrend = await getWeeklyTrend(); // Uses global trend

    return res.json({ totalClinics, activeClinics, totalUsers, totalPatients, todayQueue, todayAppointments, weeklyTrend });
  } catch (err) {
    console.error('Super admin stats error:', err);
    return res.status(500).json({ message: 'Failed to load dashboard stats.' });
  }
};

// ─── Facility Admin Dashboard ─────────────────────────────────────────────────
const getFacilityStats = async (req, res) => {
  try {
    const centerId = req.query.clinicId || req.user.centerId || req.user.clinicId;
    
    if (!centerId) {
      return res.status(400).json({ message: 'Center ID not found.' });
    }

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

    const qFilter = { 
        centerId: centerId, 
        createdAt: { $gte: todayStart, $lte: todayEnd } 
    };

    const [todayEntries, completedCount, servingCount, waitingCount] = await Promise.all([
      QueueEntry.find(qFilter).sort({ createdAt: 1 }),
      QueueEntry.countDocuments({ ...qFilter, status: { $in: ['done','completed'] } }),
      QueueEntry.countDocuments({ ...qFilter, status: 'serving' }),
      QueueEntry.countDocuments({ ...qFilter, status: 'waiting' }),
    ]);

    // Service aggregation
    const serviceMap = {};
    todayEntries.forEach(e => {
      const k = e.serviceName || 'Other';
      serviceMap[k] = (serviceMap[k] || 0) + 1;
    });
    const queueByService = Object.entries(serviceMap).map(([name, count]) => ({ name, count }));

    // Weekly trend
    const weeklyTrend = await getWeeklyTrend(centerId);

    // Recent activity
    const recentActivity = todayEntries.slice(-10).reverse().map(e => ({
      patientName: e.patientName,
      action: `${e.status.charAt(0).toUpperCase() + e.status.slice(1)} — ${e.serviceName}`,
      time: new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return res.json({
      todayPatients: todayEntries.length,
      activeQueue: waitingCount + servingCount,
      completedToday: completedCount,
      avgWaitTime: 0, 
      queueByService,
      weeklyTrend,
      recentActivity,
    });
  } catch (err) {
    console.error('Facility stats error:', err);
    return res.status(500).json({ message: 'Failed to load stats.' });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getWeeklyTrend(centerId) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const results = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d); start.setHours(0,0,0,0);
    const end   = new Date(d); end.setHours(23,59,59,999);
    
    const filter = { createdAt: { $gte: start, $lte: end } };
    if (centerId) filter.centerId = centerId;
    
    const count = await QueueEntry.countDocuments(filter);
    results.push({ day: days[d.getDay()], count });
  }
  return results;
}

module.exports = { getSuperAdminStats, getFacilityStats };