/**
 * Chatbot Controller — patient-facing chatbot endpoint
 * Proxies to Rasa if RASA_SERVER_URL is set, else uses keyword-based FAQ matching.
 */
const axios   = require('axios');
const FAQ     = require('../models/FAQ');
const ChatLog = require('../models/ChatLog');

const RASA_URL = process.env.RASA_SERVER_URL;

// POST /api/chatbot/message
// Body: { message, patientId? }
const handleMessage = async (req, res) => {
  const { message, patientId } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Message is required.' });
  }

  let response = null;

  // ── Mode 1: Proxy to Rasa ─────────────────────────────────────────────────
  if (RASA_URL) {
    try {
      const rasaRes = await axios.post(`${RASA_URL}/webhooks/rest/webhook`, {
        sender:  patientId || 'anonymous',
        message: message.trim(),
      }, { timeout: 5000 });
      const msgs = rasaRes.data;
      if (Array.isArray(msgs) && msgs.length > 0) {
        response = msgs.map(m => m.text).filter(Boolean).join('\n');
      }
    } catch (err) {
      console.warn('Rasa unavailable, falling back to FAQ:', err.message);
    }
  }

  // ── Mode 2: Keyword-based FAQ matching ────────────────────────────────────
  if (!response) {
    const msg  = message.toLowerCase().trim();
    const faqs = await FAQ.find({ isActive: true });

    let bestMatch = null;
    let bestScore = 0;

    for (const faq of faqs) {
      let score = 0;

      // Keyword match (weighted highest)
      for (const kw of faq.keywords || []) {
        if (msg.includes(kw.toLowerCase())) score += 3;
      }

      // Question word match (partial)
      const qWords = faq.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const w of qWords) {
        if (msg.includes(w)) score += 1;
      }

      if (score > bestScore) { bestScore = score; bestMatch = faq; }
    }

    if (bestMatch && bestScore >= 2) {
      response = bestMatch.answer;
      // Increment usage count
      await FAQ.findByIdAndUpdate(bestMatch._id, { $inc: { usageCount: 1 } });
    } else {
      response = "Sorry, I didn't understand your question. Please visit our reception desk or call the clinic directly for assistance.";
    }
  }

  // ── Log the interaction ───────────────────────────────────────────────────
  try {
    await ChatLog.create({
      patient:  patientId || null,
      message:  message.trim(),
      response,
      source:   RASA_URL ? 'rasa' : 'faq',
    });
  } catch (_) {}

  return res.json({ response });
};

module.exports = { handleMessage };
