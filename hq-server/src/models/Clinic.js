const mongoose = require('mongoose');

const peakHourSchema = new mongoose.Schema({
  hour: String,
  load: { type: Number, default: 0 },
}, { _id: false });

const clinicSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  address:       { type: String, default: '' },
  city:          { type: String, default: 'Quezon City' },
  latitude:      { type: Number, default: 0 },
  longitude:     { type: Number, default: 0 },
  contactNumber: { type: String, default: '' },
  status:        { type: String, enum: ['open','closed','busy'], default: 'open' },

  // Services offered at this branch
  services:      [{ type: String }],

  // Queue / wait stats (updated dynamically or seeded)
  baseWaitTimePerPerson: { type: Number, default: 10 },
  queueLength:           { type: Number, default: 0 },
  distanceKm:            { type: Number, default: 0 },
  currentWaitingTime:    { type: Number, default: 0 },

  // Peak hour load data for AI forecasting
  peakHours: [peakHourSchema],

  // Facility admin assigned to this clinic
  facilityAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Clinic', clinicSchema);
