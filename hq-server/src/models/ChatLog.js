/**
 * ChatLog model — stores chatbot conversation history
 */
const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema(
  {
    patient:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    senderId:   { type: String, default: 'anonymous' },
    message:    { type: String, required: true },
    reply:      { type: String, required: true },
    isFallback: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatLog', ChatLogSchema);
