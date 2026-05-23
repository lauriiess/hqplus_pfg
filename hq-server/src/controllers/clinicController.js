/**
 * Clinic Controller — CRUD for private clinics + recommendation logic
 */
const Clinic = require('../models/Clinic');
const QueueEntry = require('../models/QueueEntry');
const { getActiveQueueCount, estimateWaitTime } = require('../utils/queueHelpers');

// ─── Get all clinics ──────────────────────────────────────────────────────────
const getClinics = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    // Patients see only active clinics
    if (req.user.role === 'patient') filter.status = 'active';

    const clinics = await Clinic.find(filter)
      .populate('managedBy', 'fullName email')
      .sort({ name: 1 });
    return res.json(clinics);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get clinics.' });
  }
};

// ─── Get single clinic ────────────────────────────────────────────────────────
const getClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id).populate('managedBy', 'fullName email');
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    return res.json(clinic);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get clinic.' });
  }
};

// ─── Create clinic (super_admin only) ────────────────────────────────────────
const createClinic = async (req, res) => {
  try {
    const clinic = await Clinic.create(req.body);
    return res.status(201).json(clinic);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create clinic.' });
  }
};

// ─── Update clinic ────────────────────────────────────────────────────────────
const updateClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    return res.json(clinic);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update clinic.' });
  }
};

// ─── Delete clinic (super_admin only) ────────────────────────────────────────
const deleteClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndDelete(req.params.id);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    return res.json({ message: 'Clinic deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete clinic.' });
  }
};

// ─── Get clinic directory with live stats (patient view) ─────────────────────
// GET /api/clinics/directory
const getClinicDirectory = async (req, res) => {
  try {
    const clinics = await Clinic.find({ status: 'active' });

    const enriched = await Promise.all(
      clinics.map(async (clinic) => {
        const activeCount = await getActiveQueueCount(clinic._id);
        const estWait = await estimateWaitTime(clinic._id);
        return {
          ...clinic.toObject(),
          activeQueueCount: activeCount,
          estimatedWaitMinutes: estWait,
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get clinic directory.' });
  }
};

// ─── Clinic recommendation ────────────────────────────────────────────────────
// GET /api/clinics/recommend?lat=&lng=&service=&type=walk_in|appointment
const recommendClinic = async (req, res) => {
  try {
    const { lat, lng, service, type } = req.query;
    const userLat = parseFloat(lat) || null;
    const userLng = parseFloat(lng) || null;

    const filter = { status: 'active' };
    if (type === 'walk_in') filter.acceptsWalkIn = true;
    if (type === 'appointment') filter.acceptsAppointment = true;

    let clinics = await Clinic.find(filter);

    // Filter by service if specified
    if (service) {
      clinics = clinics.filter((c) =>
        c.services.some(
          (s) => s.isAvailable && s.name.toLowerCase().includes(service.toLowerCase())
        )
      );
    }

    // Enrich with live queue data
    const enriched = await Promise.all(
      clinics.map(async (clinic) => {
        const activeCount = await getActiveQueueCount(clinic._id);
        const estWait = await estimateWaitTime(clinic._id);

        // Calculate distance if user location provided
        let distanceKm = null;
        if (userLat && userLng && clinic.coordinates?.lat && clinic.coordinates?.lng) {
          distanceKm = haversineDistance(userLat, userLng, clinic.coordinates.lat, clinic.coordinates.lng);
        }

        // Recommendation score: lower is better
        // Score = (estWait * 0.6) + (distance * 2) + (activeCount * 0.4)
        const score =
          estWait * 0.6 +
          (distanceKm !== null ? distanceKm * 2 : 100) +
          activeCount * 0.4;

        return {
          ...clinic.toObject(),
          activeQueueCount: activeCount,
          estimatedWaitMinutes: estWait,
          distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
          recommendationScore: Math.round(score * 10) / 10,
        };
      })
    );

    // Sort by score ascending (best first)
    enriched.sort((a, b) => a.recommendationScore - b.recommendationScore);

    return res.json(enriched.slice(0, 5)); // return top 5
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get recommendations.' });
  }
};

// Haversine formula for distance in km
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// GET /api/clinics/directory — public list for mobile app
const getDirectory = async (req, res) => {
  try {
    const clinics = await require('../models/Clinic').find({ status: 'active' })
      .select('name address city province contactNumber email operatingHours acceptsWalkIn acceptsAppointment maxQueueCapacity facilityType status')
      .sort({ name: 1 });
    return res.json(clinics);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch clinic directory.' });
  }
};

// GET /api/clinics/recommend — filter by service/type for mobile
const getRecommendations = async (req, res) => {
  try {
    const { service, type } = req.query;
    const filter = { status: 'active' };
    if (type) filter.facilityType = { $regex: type, $options: 'i' };
    const clinics = await require('../models/Clinic').find(filter)
      .select('name address city province contactNumber operatingHours acceptsWalkIn acceptsAppointment facilityType status')
      .limit(20);
    return res.json(clinics);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch recommendations.' });
  }
};

module.exports = { getDirectory, getRecommendations,
  getClinics,
  getClinic,
  createClinic,
  updateClinic,
  deleteClinic,
  getClinicDirectory,
  recommendClinic,
};
