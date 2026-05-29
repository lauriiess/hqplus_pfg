/**
 * Dashboard Controller
 */
const QueueEntry  = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const Clinic      = require('../models/Clinic');
const User        = require('../models/User');
const Patient     = require('../models/Patient');
const mongoose    = require('mongoose');

const toId = (id) => new mongoose.Types.ObjectId(String(id));

const todayRange = () => {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(); end.setHours(23,59,59,999);
  return { $gte: start, $lte: end };
};

const getWeeklyTrend = async (clinicId) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const end = new Date(d); end.setHours(23,59,59,999);
    const label  = d.toLocaleDateString('en-PH', { weekday: 'short' });
    const filter = { joinedAt: { $gte: d, $lte: end } };
    if (clinicId) filter.clinic = toId(clinicId);
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
      weeklyTrend,
    ] = await Promise.all([
      Clinic.countDocuments({ isActive: true }),
      Clinic.countDocuments({ isActive: true, status: { $in: ['open','busy','active'] } }),
      User.countDocuments({ isActive: true }),
      Patient.countDocuments(),
      QueueEntry.countDocuments({ joinedAt: todayRange() }),
      Appointment.countDocuments({ appointmentDate: todayRange() }),
      getWeeklyTrend(null),
    ]);

    const statusBreakdown = await QueueEntry.aggregate([
      { $match: { joinedAt: todayRange() } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);

    return res.json({
      totalClinics, activeClinics,
      totalUsers, totalPatients,
      todayQueue, todayAppointments,
      weeklyTrend, statusBreakdown,
    });
  } catch (err) {
    console.error('superAdmin dashboard error:', err.message);
    return res.status(500).json({ message: 'Failed to load super admin dashboard.' });
  }
};

// GET /api/dashboard/facility?clinicId=xxx
const getFacilityStats = async (req, res) => {
  try {
    const { clinicId } = req.query;
    if (!clinicId) return res.status(400).json({ message: 'clinicId is required.' });

    const cid = toId(clinicId);

    // Fetch clinic to get service definitions
    const clinic = await Clinic.findById(cid);

    const [
      todayPatients, activeQueue, completedToday, todayAppointments,
    ] = await Promise.all([
      QueueEntry.countDocuments({ clinic: cid, joinedAt: todayRange() }),
      QueueEntry.countDocuments({ clinic: cid, status: { $in: ['waiting','serving'] } }),
      QueueEntry.countDocuments({ clinic: cid, joinedAt: todayRange(), status: { $in: ['done','completed'] } }),
      Appointment.countDocuments({ clinic: cid, appointmentDate: todayRange() }),
    ]);

    // Avg wait time from today's queue entries
    const waitAgg = await QueueEntry.aggregate([
      { $match: { clinic: cid, joinedAt: todayRange(), estimatedWaitMinutes: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$estimatedWaitMinutes' } } },
    ]);
    const avgWaitTime = Math.round(waitAgg[0]?.avg ?? 0);

    // Weekly trend
    const weeklyTrend = await getWeeklyTrend(clinicId);

    // Hourly breakdown for today
    const hourlyAgg = await QueueEntry.aggregate([
      { $match: { clinic: cid, joinedAt: todayRange() } },
      { $group: {
          _id: { $hour: { date: '$joinedAt', timezone: 'Asia/Manila' } },
          count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);
    const hourlyData = hourlyAgg.map(h => ({
      hour: `${h._id % 12 || 12} ${h._id < 12 ? 'AM' : 'PM'}`,
      count: h.count,
    }));

    // ── Service Distribution ──────────────────────────────────────
    // First try: group today's queue entries by serviceName
    const queueServiceAgg = await QueueEntry.aggregate([
      { $match: { clinic: cid, joinedAt: todayRange(), serviceName: { $exists: true, $ne: '' } } },
      { $group: { _id: '$serviceName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    let serviceDist = [];
    if (queueServiceAgg.length > 0) {
      // Real data from today's queue
      serviceDist = queueServiceAgg.map(s => ({ name: s._id, count: s.count }));
    } else if (clinic?.services?.length > 0) {
      // No queue today — use clinic's defined services with 0 counts
      // This shows the services exist even when queue is empty
      serviceDist = clinic.services
        .filter(s => s.isAvailable)
        .map(s => ({ name: s.name, count: 0 }));
    }

    // ── AI Recommendations ────────────────────────────────────────
    // Generate real insights based on actual data
    const insights = generateInsights({
      todayPatients, activeQueue, completedToday, avgWaitTime,
      todayAppointments, weeklyTrend, hourlyData, serviceDist,
      clinic,
    });

    // Completion rate
    const completionRate = todayPatients > 0
      ? Math.round((completedToday / todayPatients) * 100)
      : 0;

    // Recent queue activity
    const recentActivity = await QueueEntry.find({ clinic: cid })
      .sort({ joinedAt: -1 }).limit(10)
      .select('patientName serviceName status queueNumber joinedAt estimatedWaitMinutes');

    return res.json({
      todayPatients, activeQueue, completedToday,
      todayAppointments, avgWaitTime, completionRate,
      weeklyTrend, hourlyData, serviceDist,
      recentActivity, insights,
      clinicName: clinic?.name || '',
    });
  } catch (err) {
    console.error('facility dashboard error:', err.message);
    return res.status(500).json({ message: 'Failed to load facility dashboard.' });
  }
};

/**
 * Generate AI-style recommendations based on real clinic data
 */
function generateInsights({ todayPatients, activeQueue, completedToday, avgWaitTime,
  todayAppointments, weeklyTrend, hourlyData, serviceDist, clinic }) {
  const insights = [];

  // 1. Queue load insight
  if (activeQueue >= 10) {
    insights.push({
      type: 'warning',
      title: 'High Queue Load',
      desc: `${activeQueue} patients currently waiting or being served. Consider opening an additional service window to reduce wait times.`,
    });
  } else if (activeQueue === 0 && todayPatients === 0) {
    insights.push({
      type: 'info',
      title: 'No Activity Today',
      desc: 'No queue entries recorded today yet. The clinic is ready to receive patients.',
    });
  } else if (activeQueue > 0) {
    insights.push({
      type: 'info',
      title: 'Queue Active',
      desc: `${activeQueue} patient(s) currently in queue. Operations are running normally.`,
    });
  }

  // 2. Wait time insight
  if (avgWaitTime > 45) {
    insights.push({
      type: 'warning',
      title: 'Long Average Wait Time',
      desc: `Average wait is ${avgWaitTime} minutes — above the recommended 30-minute threshold. Review staffing for peak hours.`,
    });
  } else if (avgWaitTime > 0 && avgWaitTime <= 30) {
    insights.push({
      type: 'success',
      title: 'Wait Time On Target',
      desc: `Average wait time is ${avgWaitTime} minutes — within the ideal 30-minute target. Keep it up!`,
    });
  }

  // 3. Completion rate insight
  if (todayPatients > 0) {
    const rate = Math.round((completedToday / todayPatients) * 100);
    if (rate >= 85) {
      insights.push({
        type: 'success',
        title: 'Excellent Completion Rate',
        desc: `${rate}% of today's patients have been successfully served — above the 85% benchmark.`,
      });
    } else if (rate < 60) {
      insights.push({
        type: 'warning',
        title: 'Low Completion Rate',
        desc: `Only ${rate}% of today's patients completed their visit. Check for no-shows or cancellations.`,
      });
    }
  }

  // 4. Peak hour insight from hourly data
  if (hourlyData.length > 0) {
    const peak = hourlyData.reduce((a, b) => a.count > b.count ? a : b);
    if (peak.count > 0) {
      insights.push({
        type: 'info',
        title: `Peak Hour: ${peak.hour}`,
        desc: `The busiest time today was ${peak.hour} with ${peak.count} patient(s). Allocate more staff during this window.`,
      });
    }
  }

  // 5. Top service insight
  if (serviceDist.length > 0 && serviceDist[0].count > 0) {
    const top = serviceDist[0];
    insights.push({
      type: 'info',
      title: `Most Requested: ${top.name}`,
      desc: `${top.name} is today's most requested service with ${top.count} patient(s). Ensure adequate supplies and personnel.`,
    });
  } else if (clinic?.services?.length > 0) {
    // No queue yet — recommend based on defined services
    const peakSvc = clinic.services.find(s => s.isAvailable) || clinic.services[0];
    insights.push({
      type: 'info',
      title: 'Services Ready',
      desc: `${clinic.services.filter(s=>s.isAvailable).length} services are active and ready. ${peakSvc?.name || ''} is available for walk-ins.`,
    });
  }

  // 6. Weekly trend
  if (weeklyTrend.length >= 2) {
    const last  = weeklyTrend[weeklyTrend.length - 1].count;
    const prev  = weeklyTrend[weeklyTrend.length - 2].count;
    if (last > prev && prev > 0) {
      const pct = Math.round(((last - prev) / prev) * 100);
      insights.push({
        type: 'warning',
        title: 'Volume Trending Up',
        desc: `Today's volume is up ${pct}% vs yesterday. Prepare for higher demand tomorrow.`,
      });
    } else if (last < prev && last > 0) {
      insights.push({
        type: 'success',
        title: 'Volume Trending Down',
        desc: `Patient volume is lower than yesterday — a good opportunity to catch up on documentation and restocking.`,
      });
    }
  }

  // Always return at least 2 insights
  if (insights.length === 0) {
    insights.push({
      type: 'info',
      title: 'System Ready',
      desc: 'All systems operational. No anomalies detected for today.',
    });
  }

  return insights.slice(0, 5); // max 5
}

module.exports = { getSuperAdminStats, getFacilityStats };
