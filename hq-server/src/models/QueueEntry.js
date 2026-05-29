const mongoose = require('mongoose');

const QueueEntrySchema = new mongoose.Schema(
  {
    // Updated to match your DB's actual fields
    centerId: { type: String, required: true, index: true }, 
    
    // Legacy support: keep clinic as optional in case other parts of your app use it
    clinic: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Clinic', 
      default: null 
    },
    
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    patientPhone: { type: String, default: '' },
    queueNumber: { type: String, required: true },
    serviceName: { type: String, required: true },
    serviceType: { type: String, default: '' },
    
    status: {
      type: String,
      enum: ['waiting', 'serving', 'done', 'no_show', 'skipped', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    
    // Metrics tracked in your DB
    estWaitingTime: { type: Number, default: 0 },
    positionAhead: { type: Number, default: 0 },
    joinedWhileOnTheWay: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { 
    collection: 'queuerecords', // CRITICAL: Matches the actual DB collection
    timestamps: true            // Automatically creates createdAt and updatedAt
  }
);

// Auto-compute logic (if needed for status changes)
QueueEntrySchema.pre('save', function (next) {
  next();
});

module.exports = mongoose.model('QueueEntry', QueueEntrySchema);