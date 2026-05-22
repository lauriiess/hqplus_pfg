/**
 * Seed script — run with: npm run seed
 * Creates demo clinics, users (super_admin, facility_admin, staff, patients),
 * time slots, and a few sample queue entries + appointments.
 *
 * WARNING: This DELETES all existing data in the target collections first.
 * Use only in development.
 *
 * Fix: passwords are passed as plain text so the User pre('save') hook
 * hashes them exactly once. Do NOT pre-hash passwords here.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const User        = require('../models/User');
const Clinic      = require('../models/Clinic');
const Patient     = require('../models/Patient');
const Staff       = require('../models/Staff');
const TimeSlot    = require('../models/TimeSlot');
const QueueEntry  = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Clinic.deleteMany({}),
    Patient.deleteMany({}),
    Staff.deleteMany({}),
    TimeSlot.deleteMany({}),
    QueueEntry.deleteMany({}),
    Appointment.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── Clinics ────────────────────────────────────────────────────────────────
  const [clinicA, clinicB] = await Clinic.create([
    {
      name: 'Dela Cruz Family Clinic',
      address: '123 Rizal Street, Barangay Poblacion',
      city: 'Manila',
      province: 'Metro Manila',
      contactNumber: '+63 2 1234 5678',
      email: 'delacruz@healthqueue.ph',
      operatingHours: '8:00 AM - 5:00 PM',
      coordinates: { lat: 14.5995, lng: 120.9842 },
      acceptsWalkIn: true,
      acceptsAppointment: true,
      maxQueueCapacity: 60,
      services: [
        { name: 'General Consultation', description: 'General check-up', durationMinutes: 20, isAvailable: true },
        { name: 'Pediatrics', description: 'Child health services', durationMinutes: 25, isAvailable: true },
        { name: 'Wound Care', description: 'Minor wound treatment', durationMinutes: 15, isAvailable: true },
      ],
      status: 'active',
    },
    {
      name: 'Santos Medical Center',
      address: '45 Mabini Avenue, Brgy. San Jose',
      city: 'Quezon City',
      province: 'Metro Manila',
      contactNumber: '+63 2 9876 5432',
      email: 'santos@healthqueue.ph',
      operatingHours: '7:00 AM - 7:00 PM',
      coordinates: { lat: 14.6760, lng: 121.0437 },
      acceptsWalkIn: true,
      acceptsAppointment: true,
      maxQueueCapacity: 80,
      services: [
        { name: 'Internal Medicine', description: 'Adult internal medicine', durationMinutes: 30, isAvailable: true },
        { name: 'OB-GYN', description: 'Obstetrics and Gynecology', durationMinutes: 30, isAvailable: true },
        { name: 'ECG', description: 'Electrocardiogram', durationMinutes: 15, isAvailable: true },
      ],
      status: 'active',
    },
  ]);
  console.log('Clinics created:', clinicA.name, '/', clinicB.name);

  // ── Users — pass plain text passwords, let the pre('save') hook hash them ──
  // Do NOT call bcrypt.hash() here — that causes double hashing.
  const [superAdmin, adminA, staffA, p1, p2] = await Promise.all([
    User.create({ fullName: 'Super Admin',      email: 'superadmin@healthqueue.ph',      phone: '+63 900 000 0001', password: 'Admin@123',   role: 'super_admin',    isVerified: true }),
    User.create({ fullName: 'Maria Dela Cruz',  email: 'admin.delacruz@healthqueue.ph',  phone: '+63 900 000 0002', password: 'Admin@123',   role: 'facility_admin', clinicId: clinicA._id, isVerified: true }),
    User.create({ fullName: 'Juan Santos',      email: 'staff.santos@healthqueue.ph',    phone: '+63 900 000 0003', password: 'Staff@123',   role: 'staff',          clinicId: clinicA._id, isVerified: true }),
    User.create({ fullName: 'Ana Reyes',        email: 'ana.reyes@gmail.com',            phone: '+63 917 111 2222', password: 'Patient@123', role: 'patient',        isVerified: true }),
    User.create({ fullName: 'Carlos Bautista',  email: 'carlos.b@gmail.com',             phone: '+63 918 333 4444', password: 'Patient@123', role: 'patient',        isVerified: true }),
  ]);
  console.log('Users created');

  // Link clinic to its admin
  clinicA.managedBy = adminA._id;
  await clinicA.save();

  // ── Staff profile ──────────────────────────────────────────────────────────
  await Staff.create({
    user: staffA._id,
    clinic: clinicA._id,
    fullName: staffA.fullName,
    email: staffA.email,
    phone: staffA.phone,
    position: 'Receptionist',
    isActive: true,
  });

  // ── Patient profiles ───────────────────────────────────────────────────────
  const [pat1, pat2] = await Patient.create([
    {
      user: p1._id, fullName: p1.fullName, email: p1.email, phone: p1.phone,
      dob: new Date('1992-05-15'), age: 33, gender: 'female',
      patientType: 'Regular', address: 'Sampaloc, Manila',
    },
    {
      user: p2._id, fullName: p2.fullName, email: p2.email, phone: p2.phone,
      dob: new Date('1985-11-22'), age: 40, gender: 'male',
      patientType: 'Senior Citizen', address: 'Cubao, Quezon City',
      philHealthNumber: 'PH-123456789',
    },
  ]);
  console.log('Patient profiles created');

  // ── Time slots for Clinic A ────────────────────────────────────────────────
  const days = [1, 2, 3, 4, 5]; // Mon-Fri
  const slotTimes = [
    { startTime: '08:00', endTime: '08:30', label: '8:00 AM' },
    { startTime: '08:30', endTime: '09:00', label: '8:30 AM' },
    { startTime: '09:00', endTime: '09:30', label: '9:00 AM' },
    { startTime: '09:30', endTime: '10:00', label: '9:30 AM' },
    { startTime: '10:00', endTime: '10:30', label: '10:00 AM' },
    { startTime: '13:00', endTime: '13:30', label: '1:00 PM' },
    { startTime: '13:30', endTime: '14:00', label: '1:30 PM' },
    { startTime: '14:00', endTime: '14:30', label: '2:00 PM' },
  ];

  const svc = clinicA.services[0];
  const slotDocs = [];
  for (const day of days) {
    for (const t of slotTimes) {
      slotDocs.push({ clinic: clinicA._id, serviceId: svc._id, serviceName: svc.name, dayOfWeek: day, ...t, maxPatients: 2 });
    }
  }
  await TimeSlot.create(slotDocs);
  console.log('Time slots created');

  // ── Sample Queue Entries (today) ───────────────────────────────────────────
  const now = new Date();
  await QueueEntry.create([
    {
      clinic: clinicA._id, patient: pat1._id,
      queueNumber: 'D-001', patientName: pat1.fullName, patientPhone: pat1.phone,
      patientType: 'Regular', serviceName: 'General Consultation',
      queueType: 'walk_in', status: 'done',
      joinedAt:  new Date(now.getTime() - 90 * 60000),
      calledAt:  new Date(now.getTime() - 75 * 60000),
      servedAt:  new Date(now.getTime() - 75 * 60000),
      doneAt:    new Date(now.getTime() - 60 * 60000),
      actualWaitMinutes: 15, turnaroundMinutes: 30, positionAtJoin: 1,
    },
    {
      clinic: clinicA._id, patient: pat2._id,
      queueNumber: 'D-002', patientName: pat2.fullName, patientPhone: pat2.phone,
      patientType: 'Senior Citizen', serviceName: 'General Consultation',
      queueType: 'walk_in', status: 'waiting',
      joinedAt: new Date(now.getTime() - 20 * 60000),
      positionAtJoin: 2, estimatedWaitMinutes: 20,
    },
  ]);
  console.log('Queue entries created');

  // ── Sample Appointment ─────────────────────────────────────────────────────
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await Appointment.create({
    clinic: clinicA._id,
    patient: pat1._id,
    serviceName: 'General Consultation',
    serviceId: svc._id,
    appointmentDate: tomorrow,
    timeSlot: '9:00 AM',
    endTime: '9:30 AM',
    patientName: pat1.fullName,
    patientPhone: pat1.phone,
    patientType: 'Regular',
    reason: 'Annual check-up',
    status: 'confirmed',
    confirmedAt: new Date(),
  });
  console.log('Sample appointment created');

  console.log('\nSeed complete!\n');
  console.log('Login credentials:');
  console.log('  Super Admin:    superadmin@healthqueue.ph      / Admin@123');
  console.log('  Facility Admin: admin.delacruz@healthqueue.ph  / Admin@123');
  console.log('  Staff:          staff.santos@healthqueue.ph    / Staff@123');
  console.log('  Patient:        ana.reyes@gmail.com            / Patient@123');
  console.log('  Patient:        carlos.b@gmail.com             / Patient@123');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
