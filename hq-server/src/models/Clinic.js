const mongoose = require('mongoose');

const peakHourSchema = new mongoose.Schema({
  hour: { type: String },
  load: { type: Number, default: 0 },
}, { _id: false });

const ClinicSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  address:       { type: String, default: '' },
  city:          { type: String, default: 'Quezon City' },
  latitude:      { type: Number, default: 0 },
  longitude:     { type: Number, default: 0 },
  contactNumber: { type: String, default: '' },

  // String array — e.g. ['Laboratory', 'Ultrasound']
  services: [{ type: String }],

  status: {
    type: String,
    enum: ['open', 'closed', 'busy'],
    default: 'open',
  },

  // Queue / wait stats
  baseWaitTimePerPerson: { type: Number, default: 10 },
  queueLength:           { type: Number, default: 0 },
  distanceKm:            { type: Number, default: 0 },
  currentWaitingTime:    { type: Number, default: 0 },

  // AI forecasting data
  peakHours: [peakHourSchema],

  // Legacy fields (kept for backward compat)
  operatingHours:       { type: String, default: '8:00 AM - 5:00 PM' },
  maxQueueCapacity:     { type: Number, default: 100 },
  acceptsWalkIn:        { type: Boolean, default: true },
  acceptsAppointment:   { type: Boolean, default: true },

  facilityAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Clinic', ClinicSchema);
