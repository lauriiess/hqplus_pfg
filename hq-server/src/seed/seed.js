/**
 * Seed script — run with: npm run seed
 * Creates demo data for all modules: clinics, users, staff, patients,
 * time slots, queue entries, appointments, FAQs, and system config.
 *
 * WARNING: Deletes all existing data first. Development use only.
 * Passwords are plain text here — the User pre('save') hook hashes them.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const User         = require('../models/User');
const Clinic       = require('../models/Clinic');
const Patient      = require('../models/Patient');
const Staff        = require('../models/Staff');
const TimeSlot     = require('../models/TimeSlot');
const QueueEntry   = require('../models/QueueEntry');
const Appointment  = require('../models/Appointment');
const FAQ          = require('../models/FAQ');
const SystemConfig = require('../models/SystemConfig');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Clear all collections ──────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Clinic.deleteMany({}),
    Patient.deleteMany({}),
    Staff.deleteMany({}),
    TimeSlot.deleteMany({}),
    QueueEntry.deleteMany({}),
    Appointment.deleteMany({}),
    FAQ.deleteMany({}),
    SystemConfig.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── Clinics ────────────────────────────────────────────────────────────────
  const [clinicA, clinicB] = await Clinic.create([
    {
      name: 'Dela Cruz Family Clinic',
      address: '123 Rizal Street, Barangay Poblacion',
      city: 'Manila', province: 'Metro Manila',
      contactNumber: '+63 2 1234 5678',
      email: 'delacruz@healthqueue.ph',
      operatingHours: '8:00 AM - 5:00 PM',
      coordinates: { lat: 14.5995, lng: 120.9842 },
      acceptsWalkIn: true, acceptsAppointment: true,
      maxQueueCapacity: 60,
      services: [
        { name: 'General Consultation', description: 'General check-up and routine visit', durationMinutes: 20, isAvailable: true },
        { name: 'Pediatrics',           description: 'Child health services (0-12 years)',  durationMinutes: 25, isAvailable: true },
        { name: 'Wound Care',           description: 'Minor wound treatment and dressing',  durationMinutes: 15, isAvailable: true },
      ],
      status: 'active',
    },
    {
      name: 'Santos Medical Center',
      address: '45 Mabini Avenue, Brgy. San Jose',
      city: 'Quezon City', province: 'Metro Manila',
      contactNumber: '+63 2 9876 5432',
      email: 'santos@healthqueue.ph',
      operatingHours: '7:00 AM - 7:00 PM',
      coordinates: { lat: 14.6760, lng: 121.0437 },
      acceptsWalkIn: true, acceptsAppointment: true,
      maxQueueCapacity: 80,
      services: [
        { name: 'Internal Medicine', description: 'Adult internal medicine consultation', durationMinutes: 30, isAvailable: true },
        { name: 'OB-GYN',           description: 'Obstetrics and Gynecology',           durationMinutes: 30, isAvailable: true },
        { name: 'ECG',              description: 'Electrocardiogram test',              durationMinutes: 15, isAvailable: true },
      ],
      status: 'active',
    },
  ]);
  console.log('Clinics created:', clinicA.name, '/', clinicB.name);

  // ── Users ──────────────────────────────────────────────────────────────────
  const [superAdmin, adminA, adminB, staffA, staffB, p1, p2, p3] = await Promise.all([
    User.create({ fullName: 'Super Admin',      email: 'superadmin@healthqueue.ph',      phone: '+63 900 000 0001', password: 'Admin@123',   role: 'super_admin',    isVerified: true }),
    User.create({ fullName: 'Maria Dela Cruz',  email: 'admin.delacruz@healthqueue.ph',  phone: '+63 900 000 0002', password: 'Admin@123',   role: 'facility_admin', clinicId: clinicA._id, isVerified: true }),
    User.create({ fullName: 'Roberto Santos',   email: 'admin.santos@healthqueue.ph',    phone: '+63 900 000 0006', password: 'Admin@123',   role: 'facility_admin', clinicId: clinicB._id, isVerified: true }),
    User.create({ fullName: 'Juan Santos',      email: 'staff.santos@healthqueue.ph',    phone: '+63 900 000 0003', password: 'Staff@123',   role: 'staff',          clinicId: clinicA._id, isVerified: true }),
    User.create({ fullName: 'Liza Cruz',        email: 'staff.cruz@healthqueue.ph',      phone: '+63 900 000 0007', password: 'Staff@123',   role: 'staff',          clinicId: clinicA._id, isVerified: true }),
    User.create({ fullName: 'Ana Reyes',        email: 'ana.reyes@gmail.com',            phone: '+63 917 111 2222', password: 'Patient@123', role: 'patient',        isVerified: true }),
    User.create({ fullName: 'Carlos Bautista',  email: 'carlos.b@gmail.com',             phone: '+63 918 333 4444', password: 'Patient@123', role: 'patient',        isVerified: true }),
    User.create({ fullName: 'Rosa Mendoza',     email: 'rosa.m@gmail.com',               phone: '+63 919 555 6666', password: 'Patient@123', role: 'patient',        isVerified: true }),
  ]);
  console.log('Users created');

  // Link clinics to admins
  clinicA.managedBy = adminA._id;
  clinicB.managedBy = adminB._id;
  await Promise.all([clinicA.save(), clinicB.save()]);

  // ── Staff profiles ─────────────────────────────────────────────────────────
  await Staff.create([
    {
      user: staffA._id, clinic: clinicA._id,
      fullName: staffA.fullName, email: staffA.email, phone: staffA.phone,
      position: 'Receptionist', isActive: true,
      schedule: [
        { day: 'Monday',    startTime: '08:00', endTime: '17:00', isAvailable: true },
        { day: 'Tuesday',   startTime: '08:00', endTime: '17:00', isAvailable: true },
        { day: 'Wednesday', startTime: '08:00', endTime: '17:00', isAvailable: true },
        { day: 'Thursday',  startTime: '08:00', endTime: '17:00', isAvailable: true },
        { day: 'Friday',    startTime: '08:00', endTime: '17:00', isAvailable: true },
      ],
    },
    {
      user: staffB._id, clinic: clinicA._id,
      fullName: staffB.fullName, email: staffB.email, phone: staffB.phone,
      position: 'Nurse', specialization: 'Pediatric Nursing', isActive: true,
      schedule: [
        { day: 'Monday',    startTime: '09:00', endTime: '18:00', isAvailable: true },
        { day: 'Wednesday', startTime: '09:00', endTime: '18:00', isAvailable: true },
        { day: 'Friday',    startTime: '09:00', endTime: '18:00', isAvailable: true },
      ],
    },
  ]);
  console.log('Staff profiles created');

  // ── Patient profiles ───────────────────────────────────────────────────────
  const [pat1, pat2, pat3] = await Patient.create([
    {
      user: p1._id, fullName: p1.fullName, email: p1.email, phone: p1.phone,
      dob: new Date('1992-05-15'), age: 33, gender: 'female',
      patientType: 'Regular', address: 'Sampaloc, Manila',
    },
    {
      user: p2._id, fullName: p2.fullName, email: p2.email, phone: p2.phone,
      dob: new Date('1950-11-22'), age: 75, gender: 'male',
      patientType: 'Senior Citizen', address: 'Cubao, Quezon City',
      philHealthNumber: 'PH-123456789',
    },
    {
      user: p3._id, fullName: p3.fullName, email: p3.email, phone: p3.phone,
      dob: new Date('2000-03-10'), age: 25, gender: 'female',
      patientType: 'PWD', address: 'Pasig City', hmoProvider: 'Medicard',
    },
  ]);
  console.log('Patient profiles created');

  // ── Time Slots for Clinic A (Mon-Fri) ─────────────────────────────────────
  const svc = clinicA.services[0]; // General Consultation
  const slotData = [];
  const days = [1, 2, 3, 4, 5]; // Mon=1 to Fri=5
  const times = [
    { startTime: '08:00', endTime: '08:30', label: '8:00 AM' },
    { startTime: '08:30', endTime: '09:00', label: '8:30 AM' },
    { startTime: '09:00', endTime: '09:30', label: '9:00 AM' },
    { startTime: '09:30', endTime: '10:00', label: '9:30 AM' },
    { startTime: '10:00', endTime: '10:30', label: '10:00 AM' },
    { startTime: '13:00', endTime: '13:30', label: '1:00 PM' },
    { startTime: '13:30', endTime: '14:00', label: '1:30 PM' },
    { startTime: '14:00', endTime: '14:30', label: '2:00 PM' },
  ];
  for (const day of days) {
    for (const t of times) {
      slotData.push({ clinic: clinicA._id, serviceId: svc._id, serviceName: svc.name, dayOfWeek: day, ...t, maxPatients: 2 });
    }
  }
  await TimeSlot.create(slotData);
  console.log('Time slots created');

  // ── Sample Queue Entries (today) ───────────────────────────────────────────
  const now = new Date();
  await QueueEntry.create([
    {
      clinic: clinicA._id, patient: pat1._id,
      queueNumber: 'D-001', patientName: pat1.fullName, patientPhone: pat1.phone,
      patientType: 'Regular', serviceName: 'General Consultation',
      queueType: 'walk_in', status: 'done',
      joinedAt: new Date(now.getTime() - 90 * 60000),
      calledAt: new Date(now.getTime() - 75 * 60000),
      servedAt: new Date(now.getTime() - 75 * 60000),
      doneAt:   new Date(now.getTime() - 60 * 60000),
      actualWaitMinutes: 15, turnaroundMinutes: 30, positionAtJoin: 1,
    },
    {
      clinic: clinicA._id, patient: pat2._id,
      queueNumber: 'D-002', patientName: pat2.fullName, patientPhone: pat2.phone,
      patientType: 'Senior Citizen', serviceName: 'General Consultation',
      queueType: 'walk_in', status: 'serving',
      joinedAt: new Date(now.getTime() - 30 * 60000),
      calledAt: new Date(now.getTime() - 10 * 60000),
      servedAt: new Date(now.getTime() - 10 * 60000),
      actualWaitMinutes: 20, positionAtJoin: 2, estimatedWaitMinutes: 20,
    },
    {
      clinic: clinicA._id, patient: pat3._id,
      queueNumber: 'D-003', patientName: pat3.fullName, patientPhone: pat3.phone,
      patientType: 'PWD', serviceName: 'General Consultation',
      queueType: 'walk_in', status: 'waiting',
      joinedAt: new Date(now.getTime() - 5 * 60000),
      positionAtJoin: 3, estimatedWaitMinutes: 25,
    },
  ]);
  console.log('Queue entries created');

  // ── Sample Appointments ────────────────────────────────────────────────────
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(13, 0, 0, 0);

  await Appointment.create([
    {
      clinic: clinicA._id, patient: pat1._id,
      serviceName: 'General Consultation', serviceId: svc._id,
      appointmentDate: tomorrow, timeSlot: '9:00 AM', endTime: '9:30 AM',
      patientName: pat1.fullName, patientPhone: pat1.phone, patientType: 'Regular',
      reason: 'Annual check-up', status: 'confirmed', confirmedAt: new Date(),
    },
    {
      clinic: clinicA._id, patient: pat2._id,
      serviceName: 'Wound Care', serviceId: clinicA.services[2]._id,
      appointmentDate: dayAfter, timeSlot: '1:00 PM', endTime: '1:30 PM',
      patientName: pat2.fullName, patientPhone: pat2.phone, patientType: 'Senior Citizen',
      reason: 'Follow-up wound dressing', status: 'pending',
    },
  ]);
  console.log('Appointments created');

  // ── FAQs ───────────────────────────────────────────────────────────────────
  await FAQ.create([
    { question: 'How do I book an appointment?',
      answer: 'You can book an appointment through the HealthQueue+ mobile app or by visiting our front desk during operating hours.',
      category: 'Appointments', keywords: ['appointment','book','schedule','booking','reserve'], isActive: true },
    { question: 'How long is the waiting time?',
      answer: 'Current average wait time is approximately 18 minutes. You can check your real-time queue status on the display screen or the mobile app.',
      category: 'Queue Information', keywords: ['wait','waiting','queue','how long','time'], isActive: true },
    { question: 'What departments do you have?',
      answer: 'We have General Consultation, Pre-natal Care, Child Immunization, Family Planning, TB-DOTS, Dental Services, and Wound Care.',
      category: 'General Info', keywords: ['department','specialty','services','where','section'], isActive: true },
    { question: 'What are your operating hours?',
      answer: 'We are open Monday to Saturday, 8:00 AM to 5:00 PM. Closed on Sundays and public holidays.',
      category: 'General Info', keywords: ['hours','open','schedule','time','operating','close'], isActive: true },
    { question: 'Do you accept walk-in patients?',
      answer: 'Yes! Walk-in patients are welcome. Please proceed to the reception area to get your queue number.',
      category: 'Queue Information', keywords: ['walk-in','walk in','walkin','no appointment','drop in'], isActive: true },
    { question: 'How do I use my OTP?',
      answer: 'The OTP (One-Time Password) is sent to your registered mobile number. Enter it in the app within 10 minutes to verify your account.',
      category: 'Account', keywords: ['otp','one time password','verify','verification','code'], isActive: true },
    { question: 'How can I cancel my appointment?',
      answer: 'You can cancel your appointment through the mobile app at least 2 hours before your scheduled time, or call the clinic directly.',
      category: 'Appointments', keywords: ['cancel','cancellation','reschedule','remove appointment'], isActive: true },
    { question: 'Is the service free?',
      answer: 'Most basic health services are free for all residents. Some specialized services may have minimal fees. Please ask at the reception.',
      category: 'General Info', keywords: ['free','cost','fee','price','charge','payment'], isActive: true },
  ]);
  console.log('FAQs created');

  // ── System Config (defaults) ──────────────────────────────────────────────
  await SystemConfig.create([
    { key: 'app_name',             value: 'HealthQueue+', label: 'Application Name',           group: 'General',      description: 'The name of the platform shown to users.' },
    { key: 'max_queue_per_clinic', value: 100,            label: 'Max Queue Per Clinic',        group: 'Queue',        description: 'Maximum number of patients in a queue per day per clinic.' },
    { key: 'queue_reset_time',     value: '00:00',        label: 'Daily Queue Reset Time',      group: 'Queue',        description: 'Time of day when queue numbers reset (24hr format).' },
    { key: 'appointment_buffer',   value: 15,             label: 'Appointment Buffer (min)',    group: 'Appointments', description: 'Minimum gap between appointment slots in minutes.' },
    { key: 'allow_self_register',  value: true,           label: 'Allow Patient Self-Register', group: 'Security',     description: 'Allow patients to register their own accounts.' },
    { key: 'otp_expiry_minutes',   value: 10,             label: 'OTP Expiry (minutes)',        group: 'Security',     description: 'How long an OTP remains valid after being sent.' },
    { key: 'rasa_server_url',      value: '',             label: 'Rasa Chatbot Server URL',     group: 'Chatbot',      description: 'External Rasa NLU server URL. Leave empty to use rule-based fallback.' },
    { key: 'maintenance_mode',     value: false,          label: 'Maintenance Mode',            group: 'General',      description: 'When enabled, the app displays a maintenance notice to patients.' },
  ]);
  console.log('System config seeded');

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Super Admin:    superadmin@healthqueue.ph      / Admin@123');
  console.log('  Facility Admin: admin.delacruz@healthqueue.ph  / Admin@123  (Dela Cruz Clinic)');
  console.log('  Facility Admin: admin.santos@healthqueue.ph    / Admin@123  (Santos Medical)');
  console.log('  Staff:          staff.santos@healthqueue.ph    / Staff@123');
  console.log('  Patient:        ana.reyes@gmail.com            / Patient@123');
  console.log('  Patient:        carlos.b@gmail.com             / Patient@123');
  console.log('  Patient:        rosa.m@gmail.com               / Patient@123');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
