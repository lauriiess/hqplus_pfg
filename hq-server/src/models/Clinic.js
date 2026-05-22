/**
 * Clinic (Private Clinic) model
 * Replaces the old HealthCenter model — now focused on private clinics.
 */
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, default: 30 },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: true }
);

const ClinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    province: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true, trim: true },
    operatingHours: { type: String, default: '8:00 AM - 5:00 PM' },
    // Geolocation for clinic recommendation
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    // What type of visits the clinic accepts
    acceptsWalkIn: { type: Boolean, default: true },
    acceptsAppointment: { type: Boolean, default: true },
    // Clinic capacity per day
    maxQueueCapacity: { type: Number, default: 50 },
    // Services offered
    services: [ServiceSchema],
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    // Managed by which facility_admin user
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Clinic', ClinicSchema);
