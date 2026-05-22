/**
 * FAQ model — for Chatbot Administration module
 */
const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema(
  {
    question:  { type: String, required: true, trim: true },
    answer:    { type: String, required: true, trim: true },
    category:  { type: String, default: 'General', trim: true },
    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FAQ', FAQSchema);
