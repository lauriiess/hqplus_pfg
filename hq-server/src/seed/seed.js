/**
 * HealthQueue+ Seed Script — Hi-Precision Diagnostics (8 branches)
 * Run: npm run seed
 * WARNING: Clears all existing data first!
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose   = require('mongoose');
const User       = require('../models/User');
const Clinic     = require('../models/Clinic');
const FAQ        = require('../models/FAQ');
const SystemConfig = require('../models/SystemConfig');

// Safely import optional models
let Patient, Staff, TimeSlot, QueueEntry, Appointment;
try { Patient     = require('../models/Patient'); }     catch(_) {}
try { Staff       = require('../models/Staff'); }       catch(_) {}
try { TimeSlot    = require('../models/TimeSlot'); }    catch(_) {}
try { QueueEntry  = require('../models/QueueEntry'); }  catch(_) {}
try { Appointment = require('../models/Appointment'); } catch(_) {}

// ── Clinic Data ───────────────────────────────────────────────────────────────
const clinics = [
  { name: 'Hi-Precision Diagnostics - Congressional',
    address: 'Congressional Ave, Project 8, Quezon City', city: 'Quezon City',
    latitude: 14.6625, longitude: 121.0335, contactNumber: '+63 2 8927-1111', status: 'open',
    services: ['Laboratory','Ultrasound','Digital X-Ray','ECG & Cardiology','Drug Testing','Executive Health'],
    baseWaitTimePerPerson: 10, queueLength: 8, distanceKm: 0.8, currentWaitingTime: 80,
    peakHours: [{hour:'08:00',load:50},{hour:'10:00',load:85},{hour:'12:00',load:95},{hour:'14:00',load:60},{hour:'16:00',load:45},{hour:'18:00',load:20}] },

  { name: 'Hi-Precision Diagnostics - Del Monte',
    address: '442 Del Monte Ave, San Francisco del Monte, Quezon City', city: 'Quezon City',
    latitude: 14.6360, longitude: 121.0125, contactNumber: '+63 2 8374-1234', status: 'open',
    services: ['Laboratory','Ultrasound','Digital X-Ray','Executive Health','Mammography & Pap Smear'],
    baseWaitTimePerPerson: 12, queueLength: 2, distanceKm: 2.9, currentWaitingTime: 24,
    peakHours: [{hour:'08:00',load:40},{hour:'10:00',load:60},{hour:'12:00',load:70},{hour:'14:00',load:50},{hour:'16:00',load:80},{hour:'18:00',load:30}] },

  { name: 'Hi-Precision Diagnostics - Quezon Avenue',
    address: 'Quezon Ave corner G. Araneta Ave, Quezon City', city: 'Quezon City',
    latitude: 14.6225, longitude: 121.0110, contactNumber: '+63 2 8741-7777', status: 'open',
    services: ['Laboratory','Ultrasound','Digital X-Ray','ECG & Cardiology','CT Scan & MRI','Executive Health','Mammography & Pap Smear'],
    baseWaitTimePerPerson: 15, queueLength: 1, distanceKm: 4.3, currentWaitingTime: 15,
    peakHours: [{hour:'08:00',load:30},{hour:'10:00',load:55},{hour:'12:00',load:65},{hour:'14:00',load:80},{hour:'16:00',load:55},{hour:'18:00',load:25}] },

  { name: 'Hi-Precision Diagnostics - V. Luna',
    address: 'V. Luna Road corner Malumanay St, Diliman, Quezon City', city: 'Quezon City',
    latitude: 14.6335, longitude: 121.0495, contactNumber: '+63 2 8920-5555', status: 'open',
    services: ['Laboratory','Digital X-Ray','ECG & Cardiology','Drug Testing'],
    baseWaitTimePerPerson: 8, queueLength: 12, distanceKm: 3.1, currentWaitingTime: 96,
    peakHours: [{hour:'08:00',load:75},{hour:'10:00',load:90},{hour:'12:05',load:100},{hour:'14:00',load:80},{hour:'16:00',load:85},{hour:'18:00',load:60}] },

  { name: 'Hi-Precision Diagnostics - Banawe',
    address: 'Banawe St. corner N.S. Amoranto, Quezon City', city: 'Quezon City',
    latitude: 14.6310, longitude: 121.0020, contactNumber: '+63 2 8740-9999', status: 'open',
    services: ['Laboratory','Ultrasound','Digital X-Ray','ECG & Cardiology','Executive Health'],
    baseWaitTimePerPerson: 10, queueLength: 4, distanceKm: 4.1, currentWaitingTime: 40,
    peakHours: [{hour:'08:00',load:45},{hour:'10:00',load:70},{hour:'12:00',load:80},{hour:'14:00',load:60},{hour:'16:00',load:75},{hour:'18:00',load:40}] },

  { name: 'Hi-Precision Diagnostics - Retiro',
    address: 'N.S. Amoranto Sr. St, Quezon City', city: 'Quezon City',
    latitude: 14.6315, longitude: 121.0080, contactNumber: '+63 2 8415-8888', status: 'open',
    services: ['Laboratory','Ultrasound','Digital X-Ray','Mammography & Pap Smear'],
    baseWaitTimePerPerson: 9, queueLength: 3, distanceKm: 3.8, currentWaitingTime: 27,
    peakHours: [{hour:'08:00',load:35},{hour:'10:00',load:50},{hour:'12:00',load:75},{hour:'14:00',load:55},{hour:'16:00',load:60},{hour:'18:00',load:30}] },

  { name: 'Hi-Precision Diagnostics - Congressional Extension',
    address: 'Congressional Ave Extension, Miranila, Quezon City', city: 'Quezon City',
    latitude: 14.6685, longitude: 121.0620, contactNumber: '+63 2 8352-2222', status: 'open',
    services: ['Laboratory','Digital X-Ray','Executive Health','ECG & Cardiology'],
    baseWaitTimePerPerson: 11, queueLength: 5, distanceKm: 3.8, currentWaitingTime: 55,
    peakHours: [{hour:'08:00',load:40},{hour:'10:00',load:65},{hour:'12:00',load:85},{hour:'14:00',load:70},{hour:'16:00',load:50},{hour:'18:00',load:20}] },

  { name: 'Hi-Precision Diagnostics - East Avenue',
    address: 'East Avenue, Diliman, Quezon City', city: 'Quezon City',
    latitude: 14.6405, longitude: 121.0450, contactNumber: '+63 2 8928-8888', status: 'open',
    services: ['Laboratory','Ultrasound','Digital X-Ray','CT Scan & MRI','Executive Health'],
    baseWaitTimePerPerson: 14, queueLength: 6, distanceKm: 3.3, currentWaitingTime: 84,
    peakHours: [{hour:'08:00',load:50},{hour:'10:00',load:80},{hour:'12:00',load:90},{hour:'14:00',load:75},{hour:'16:00',load:60},{hour:'18:00',load:45}] },
];

// ── Users ─────────────────────────────────────────────────────────────────────
const users = [
  { fullName: 'Super Admin',     email: 'superadmin@hqplus.com',    phone: '+639000000001', password: 'Admin@1234',   role: 'super_admin',    isVerified: true },
  { fullName: 'Facility Admin',  email: 'facilityadmin@hqplus.com', phone: '+639000000002', password: 'Admin@1234',   role: 'facility_admin', isVerified: true },
  { fullName: 'Staff Member',    email: 'staff@hqplus.com',         phone: '+639000000003', password: 'Staff@1234',   role: 'staff',          isVerified: true },
  { fullName: 'Juan Dela Cruz',  email: 'patient@hqplus.com',       phone: '+639171234567', password: 'Patient@1234', role: 'patient',        isVerified: true },
];

// ── FAQs ──────────────────────────────────────────────────────────────────────
const faqs = [
  { question: 'How do I join the queue?',
    answer: 'Open the app, select your clinic and service, then tap "Get Queue Number". You will receive a ticket with your position and estimated wait time.', isActive: true },
  { question: 'How do I book an appointment?',
    answer: 'Tap "Book Appointment" on the dashboard, select your preferred clinic, service, date, and time slot.', isActive: true },
  { question: 'Can I cancel my appointment?',
    answer: 'Yes. Go to the Appointments tab, find your booking, and tap "Cancel Appointment".', isActive: true },
  { question: 'What is a priority queue?',
    answer: 'Priority queues are for senior citizens (60+), persons with disabilities (PWD), and pregnant women. Please present a valid ID at the clinic.', isActive: true },
  { question: 'How accurate is the wait time estimate?',
    answer: 'Wait times are estimated based on current queue length and average service time. Actual times may vary slightly.', isActive: true },
  { question: 'What services does Hi-Precision Diagnostics offer?',
    answer: 'Services include: Laboratory, Ultrasound, Digital X-Ray, ECG & Cardiology, CT Scan & MRI, Drug Testing, Executive Health, and Mammography & Pap Smear. Availability varies by branch.', isActive: true },
  { question: 'Which branches are open?',
    answer: 'All 8 Hi-Precision Diagnostics branches in Quezon City are currently open: Congressional, Del Monte, Quezon Avenue, V. Luna, Banawe, Retiro, Congressional Extension, and East Avenue.', isActive: true },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear all collections
  const toDelete = [User, Clinic, FAQ, SystemConfig];
  if (Patient)     toDelete.push(Patient);
  if (Staff)       toDelete.push(Staff);
  if (TimeSlot)    toDelete.push(TimeSlot);
  if (QueueEntry)  toDelete.push(QueueEntry);
  if (Appointment) toDelete.push(Appointment);
  await Promise.all(toDelete.map(M => M.deleteMany({})));
  console.log('Cleared existing data');

  // Users (pre-save hook hashes passwords — plain text here)
  for (const u of users) {
    await User.create(u);
  }
  console.log(`✅ Created ${users.length} users`);

  // Clinics
  const created = await Clinic.insertMany(clinics);
  console.log(`✅ Created ${created.length} clinics`);

  // FAQs
  await FAQ.insertMany(faqs);
  console.log(`✅ Created ${faqs.length} FAQs`);

  // System config
  await SystemConfig.create({
    key: 'general',
    siteName: 'HealthQueue+',
    maintenanceMode: false,
    enableNotifications: true,
  });
  console.log('✅ System config initialized');

  console.log('\n🎉 Seed complete!\n');
  console.log('Demo accounts:');
  console.log('  Super Admin    → superadmin@hqplus.com    / Admin@1234');
  console.log('  Facility Admin → facilityadmin@hqplus.com / Admin@1234');
  console.log('  Staff          → staff@hqplus.com         / Staff@1234');
  console.log('  Patient        → patient@hqplus.com       / Patient@1234');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
