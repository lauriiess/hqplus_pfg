/**
 * HealthQueue+ Master Seed Script
 * Run: npm run seed
 * Clears and repopulates: User, Clinic, Patient, Staff, FAQ, SystemConfig, QueueEntry, Appointment
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose   = require('mongoose');
const User       = require('../models/User');
const Clinic     = require('../models/Clinic');
const Patient    = require('../models/Patient');
const Staff      = require('../models/Staff');
const FAQ        = require('../models/FAQ');
const SystemConfig = require('../models/SystemConfig');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');

// ── Clinic data ───────────────────────────────────────────────────────────────
const CLINICS = [
  {
    name: 'Hi-Precision Diagnostics - Congressional',
    address: 'Congressional Ave, Project 8, Quezon City', city: 'Quezon City', province: 'Metro Manila', region: 'NCR',
    latitude: 14.6625, longitude: 121.0335, contactNumber: '+63 2 8927-1111',
    facilityType: 'Diagnostic Center', operatingHours: '7:00 AM - 5:00 PM',
    status: 'open', maxQueueCapacity: 80, acceptsWalkIn: true, acceptsAppointment: true,
    baseWaitTimePerPerson: 10, queueLength: 0, currentWaitingTime: 0,
    services: [
      { name: 'Laboratory', description: 'Blood, urine, and other lab tests', durationMinutes: 30, isAvailable: true },
      { name: 'Ultrasound', description: 'Abdominal and pelvic ultrasound', durationMinutes: 45, isAvailable: true },
      { name: 'Digital X-Ray', description: 'Chest and extremity X-Ray', durationMinutes: 20, isAvailable: true },
      { name: 'ECG & Cardiology', description: 'Electrocardiogram services', durationMinutes: 30, isAvailable: true },
      { name: 'Drug Testing', description: 'DOLE and pre-employment drug test', durationMinutes: 20, isAvailable: true },
      { name: 'Executive Health', description: 'Comprehensive executive health package', durationMinutes: 120, isAvailable: true },
    ],
    peakHours: [{hour:'08:00',load:50},{hour:'10:00',load:85},{hour:'12:00',load:95},{hour:'14:00',load:60},{hour:'16:00',load:45}],
  },
  {
    name: 'Hi-Precision Diagnostics - Del Monte',
    address: '442 Del Monte Ave, San Francisco del Monte, Quezon City', city: 'Quezon City', province: 'Metro Manila', region: 'NCR',
    latitude: 14.6360, longitude: 121.0125, contactNumber: '+63 2 8374-1234',
    facilityType: 'Diagnostic Center', operatingHours: '7:00 AM - 5:00 PM',
    status: 'open', maxQueueCapacity: 60, acceptsWalkIn: true, acceptsAppointment: true,
    baseWaitTimePerPerson: 12, queueLength: 0, currentWaitingTime: 0,
    services: [
      { name: 'Laboratory',      description: 'Complete blood count and chemistry panel', durationMinutes: 30, isAvailable: true },
      { name: 'Ultrasound',      description: 'OB and abdominal ultrasound', durationMinutes: 45, isAvailable: true },
      { name: 'Digital X-Ray',   description: 'Chest X-Ray PA view', durationMinutes: 20, isAvailable: true },
      { name: 'Executive Health',description: 'Annual executive health screening', durationMinutes: 120, isAvailable: true },
      { name: 'Mammography & Pap Smear', description: "Women's health screening", durationMinutes: 60, isAvailable: true },
    ],
    peakHours: [{hour:'08:00',load:40},{hour:'10:00',load:60},{hour:'12:00',load:70},{hour:'14:00',load:50},{hour:'16:00',load:80}],
  },
  {
    name: 'Hi-Precision Diagnostics - Quezon Avenue',
    address: 'Quezon Ave corner G. Araneta Ave, Quezon City', city: 'Quezon City', province: 'Metro Manila', region: 'NCR',
    latitude: 14.6225, longitude: 121.0110, contactNumber: '+63 2 8741-7777',
    facilityType: 'Diagnostic Center', operatingHours: '7:00 AM - 6:00 PM',
    status: 'open', maxQueueCapacity: 100, acceptsWalkIn: true, acceptsAppointment: true,
    baseWaitTimePerPerson: 15, queueLength: 0, currentWaitingTime: 0,
    services: [
      { name: 'Laboratory',      description: 'Full laboratory panel', durationMinutes: 30, isAvailable: true },
      { name: 'Ultrasound',      description: 'All types of ultrasound', durationMinutes: 45, isAvailable: true },
      { name: 'Digital X-Ray',   description: 'Digital radiography', durationMinutes: 20, isAvailable: true },
      { name: 'ECG & Cardiology',description: 'ECG and stress test', durationMinutes: 30, isAvailable: true },
      { name: 'CT Scan & MRI',   description: 'Advanced imaging services', durationMinutes: 60, isAvailable: true },
      { name: 'Executive Health',description: 'Comprehensive health package', durationMinutes: 120, isAvailable: true },
      { name: 'Mammography & Pap Smear', description: "Women's preventive health", durationMinutes: 60, isAvailable: true },
    ],
    peakHours: [{hour:'08:00',load:30},{hour:'10:00',load:55},{hour:'12:00',load:65},{hour:'14:00',load:80},{hour:'16:00',load:55}],
  },
  {
    name: 'Hi-Precision Diagnostics - V. Luna',
    address: 'V. Luna Road corner Malumanay St, Diliman, Quezon City', city: 'Quezon City', province: 'Metro Manila', region: 'NCR',
    latitude: 14.6335, longitude: 121.0495, contactNumber: '+63 2 8920-5555',
    facilityType: 'Diagnostic Center', operatingHours: '7:00 AM - 5:00 PM',
    status: 'open', maxQueueCapacity: 60, acceptsWalkIn: true, acceptsAppointment: true,
    baseWaitTimePerPerson: 8, queueLength: 0, currentWaitingTime: 0,
    services: [
      { name: 'Laboratory',      description: 'Hematology and chemistry', durationMinutes: 30, isAvailable: true },
      { name: 'Digital X-Ray',   description: 'Chest and bone X-ray', durationMinutes: 20, isAvailable: true },
      { name: 'ECG & Cardiology',description: '12-lead ECG', durationMinutes: 30, isAvailable: true },
      { name: 'Drug Testing',    description: 'Pre-employment drug test', durationMinutes: 20, isAvailable: true },
    ],
    peakHours: [{hour:'08:00',load:75},{hour:'10:00',load:90},{hour:'12:00',load:100},{hour:'14:00',load:80},{hour:'16:00',load:85}],
  },
];

// ── Users ──────────────────────────────────────────────────────────────────────
const BASE_USERS = [
  { fullName: 'Super Admin',    email: 'superadmin@hqplus.com',    phone: '+639000000001', password: 'Admin@1234',   role: 'super_admin',    isVerified: true },
  { fullName: 'Facility Admin', email: 'facilityadmin@hqplus.com', phone: '+639000000002', password: 'Admin@1234',   role: 'facility_admin', isVerified: true },
  { fullName: 'Staff Member',   email: 'staff@hqplus.com',         phone: '+639000000003', password: 'Staff@1234',   role: 'staff',          isVerified: true },
  { fullName: 'Ana Reyes',      email: 'ana.reyes@gmail.com',      phone: '+639171111111', password: 'Patient@123',  role: 'patient',        isVerified: true },
  { fullName: 'Carlos Buenaventura', email: 'carlos.b@gmail.com',  phone: '+639172222222', password: 'Patient@123',  role: 'patient',        isVerified: true },
  { fullName: 'Rosa Mendoza',   email: 'rosa.m@gmail.com',         phone: '+639173333333', password: 'Patient@123',  role: 'patient',        isVerified: true },
];

// ── FAQ data ───────────────────────────────────────────────────────────────────
const FAQS = [
  { question: 'How do I join a queue?',              answer: 'Open the app, tap "Get Queue Number", select a clinic and service, then confirm.',           category: 'queue' },
  { question: 'Can I book an appointment online?',   answer: 'Yes. Tap "Book Appointment" from the dashboard, choose a clinic, service, date and time.',   category: 'appointment' },
  { question: 'How do I cancel my queue number?',    answer: 'Go to Queue Status and tap the Cancel button next to your active queue entry.',              category: 'queue' },
  { question: 'What are the operating hours?',       answer: 'Most Hi-Precision branches are open from 7:00 AM to 5:00 PM, Monday to Saturday.',           category: 'general' },
  { question: 'How does AI Suggest work?',           answer: 'AI Suggest scores nearby clinics by current queue load and estimated wait time to recommend the fastest option.', category: 'general' },
  { question: 'Can I have multiple queue entries?',  answer: 'No. You can only have one active queue entry per clinic per day.',                           category: 'queue' },
  { question: 'How accurate is the estimated wait?', answer: 'Wait time is estimated based on current queue length and historical service duration per patient.', category: 'queue' },
];

// ── Main seed function ────────────────────────────────────────────────────────
const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear all collections
  console.log('🗑  Clearing collections…');
  await Promise.all([
    User.deleteMany({}),
    Clinic.deleteMany({}),
    Patient.deleteMany({}),
    Staff.deleteMany({}),
    QueueEntry.deleteMany({}),
    Appointment.deleteMany({}),
    FAQ.deleteMany({}),
    SystemConfig.deleteMany({}),
  ]);

  // Create clinics
  console.log('🏥 Seeding clinics…');
  const createdClinics = await Clinic.insertMany(CLINICS);
  const mainClinic     = createdClinics[0];
  console.log(`  ✓ ${createdClinics.length} clinics created`);

  // Create users
  console.log('👤 Seeding users…');
  const createdUsers = [];
  for (const u of BASE_USERS) {
    const role      = u.role;
    const clinicId  = role === 'facility_admin' ? mainClinic._id
                    : role === 'staff'           ? mainClinic._id
                    : null;
    const user = await User.create({ ...u, clinicId, isActive: true });
    createdUsers.push(user);
    console.log(`  ✓ ${user.role}: ${user.email}`);
  }

  // Create patient profiles for patient-role users
  console.log('🩺 Seeding patient profiles…');
  for (const u of createdUsers.filter(u => u.role === 'patient')) {
    await Patient.create({
      user:        u._id,
      fullName:    u.fullName,
      email:       u.email,
      phone:       u.phone,
      patientType: 'Regular',
    });
  }
  console.log(`  ✓ ${createdUsers.filter(u=>u.role==='patient').length} patient profiles`);

  // Create staff profile for staff user
  console.log('👨‍⚕️ Seeding staff profiles…');
  const staffUser = createdUsers.find(u => u.role === 'staff');
  if (staffUser) {
    await Staff.create({
      user:     staffUser._id,
      clinic:   mainClinic._id,
      fullName: staffUser.fullName,
      email:    staffUser.email,
      role:     'admin',
      position: 'Receptionist',
      isActive: true,
    });
    console.log('  ✓ 1 staff profile');
  }

  // Seed FAQs
  console.log('💬 Seeding FAQs…');
  await FAQ.insertMany(FAQS.map(f => ({ ...f, isActive: true })));
  console.log(`  ✓ ${FAQS.length} FAQs`);

  // Seed SystemConfig
  console.log('⚙️  Seeding system config…');
  await SystemConfig.create({
    systemName:     'HealthQueue+',
    version:        '2.0.0',
    maintenanceMode: false,
    allowRegistration: true,
    maxQueuePerUser: 1,
    defaultWaitTimePerPerson: 10,
    chatbotEnabled: true,
  });
  console.log('  ✓ System config created');

  console.log('\n✅ Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Super Admin:    superadmin@hqplus.com    / Admin@1234');
  console.log('  Facility Admin: facilityadmin@hqplus.com / Admin@1234');
  console.log('  Staff:          staff@hqplus.com         / Staff@1234');
  console.log('  Patient:        ana.reyes@gmail.com      / Patient@123');

  await mongoose.disconnect();
};

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
