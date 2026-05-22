/**
 * QueueEntry model — one record per patient per clinic visit (walk-in or scheduled)
 *
 * Status flow:
 *   waiting → serving → done
 *                     → no_show   (5-min grace period expired)
 *                     → skipped   (staff skipped)
 *                     → cancelled (patient/admin cancelled)
 */
const mongoose = require('mongoose');

const QueueEntrySchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null, // null for walk-in patients registered by staff
    },
    // Queue number displayed to patient (e.g. "A-023")
    queueNumber: { type: String, required: true },
    // Patient info (copied at queue join time for quick display)
    patientName: { type: String, required: true },
    patientPhone: { type: String, default: '' },
    patientType: {
      type: String,
      enum: ['Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority'],
      default: 'Regular',
    },
    // Which service they're queuing for
    serviceName: { type: String, required: true },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Queue type: walk-in or appointment-linked
    queueType: {
      type: String,
      enum: ['walk_in', 'appointment'],
      default: 'walk_in',
    },
    // If appointment-linked, reference the appointment
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    status: {
      type: String,
      enum: ['waiting', 'serving', 'done', 'no_show', 'skipped', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    // Timestamps for metrics
    joinedAt: { type: Date, default: Date.now },
    calledAt: { type: Date, default: null },   // when staff pressed "Call"
    servedAt: { type: Date, default: null },   // when service started
    doneAt: { type: Date, default: null },     // when completed/no-show/etc.
    // Position in queue at join time
    positionAtJoin: { type: Number, default: 1 },
    // Computed metrics (in minutes)
    estimatedWaitMinutes: { type: Number, default: 0 },
    actualWaitMinutes: { type: Number, default: null },    // calledAt - joinedAt
    turnaroundMinutes: { type: Number, default: null },    // doneAt - joinedAt
    notes: { type: String, default: '' },
    // For grace period tracking
    gracePeriodStart: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-compute wait/turnaround when done
QueueEntrySchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();
    if (this.status === 'serving' && !this.servedAt) {
      this.servedAt = now;
    }
    if (['done', 'no_show', 'cancelled', 'skipped'].includes(this.status) && !this.doneAt) {
      this.doneAt = now;
    }
    if (this.calledAt && this.joinedAt) {
      this.actualWaitMinutes = Math.round(
        (this.calledAt - this.joinedAt) / 60000
      );
    }
    if (this.doneAt && this.joinedAt) {
      this.turnaroundMinutes = Math.round(
        (this.doneAt - this.joinedAt) / 60000
      );
    }
  }
  next();
});

module.exports = mongoose.model('QueueEntry', QueueEntrySchema);
