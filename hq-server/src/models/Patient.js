/**
 * Patient profile model (linked to a User account)
 */
const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema(
  {
    // Link to the User account
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: { type: String, required: true, trim: true },
    dob: { type: Date, default: null },
    age: { type: Number, default: null },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: '',
    },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', lowercase: true, trim: true },
    address: { type: String, default: '' },
    philHealthNumber: { type: String, default: '' },
    hmoProvider: { type: String, default: '' },
    patientType: {
      type: String,
      enum: ['Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority'],
      default: 'Regular',
    },
    medicalNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', PatientSchema);
