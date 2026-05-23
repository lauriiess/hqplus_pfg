/**
 * Chatbot Admin Controller — manage FAQs and view chat logs
 */
const FAQ     = require('../models/FAQ');
const ChatLog = require('../models/ChatLog');

// ── FAQs ──────────────────────────────────────────────────────────────────────
const getFAQs = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.active === 'true') filter.isActive = true;
    const faqs = await FAQ.find(filter).sort({ category: 1, createdAt: -1 });
    return res.json(faqs);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch FAQs.' });
  }
};

const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, keywords, isActive } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required.' });
    }
    // Normalise keywords — split comma-separated string OR accept array
    const kws = Array.isArray(keywords)
      ? keywords.map(k => k.trim().toLowerCase()).filter(Boolean)
      : typeof keywords === 'string'
        ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
        : [];

    const faq = await FAQ.create({
      question:  question.trim(),
      answer:    answer.trim(),
      category:  category || 'General Info',
      keywords:  kws,
      isActive:  isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    });
    return res.status(201).json(faq);
  } catch (err) {
    console.error('createFAQ error:', err.message);
    return res.status(500).json({ message: 'Failed to create FAQ.' });
  }
};

const updateFAQ = async (req, res) => {
  try {
    const { question, answer, category, keywords, isActive } = req.body;
    const update = {};
    if (question  !== undefined) update.question  = question.trim();
    if (answer    !== undefined) update.answer    = answer.trim();
    if (category  !== undefined) update.category  = category;
    if (isActive  !== undefined) update.isActive  = isActive;
    if (keywords  !== undefined) {
      update.keywords = Array.isArray(keywords)
        ? keywords.map(k => k.trim().toLowerCase()).filter(Boolean)
        : typeof keywords === 'string'
          ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
          : [];
    }
    const faq = await FAQ.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!faq) return res.status(404).json({ message: 'FAQ not found.' });
    return res.json(faq);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update FAQ.' });
  }
};

const deleteFAQ = async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    return res.json({ message: 'FAQ deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete FAQ.' });
  }
};

// ── Chat Logs ─────────────────────────────────────────────────────────────────
const getChatLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const logs  = await ChatLog.find({})
      .populate('patient', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit);
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch chat logs.' });
  }
};

// ── Analytics ─────────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const totalFAQs  = await FAQ.countDocuments();
    const activeFAQs = await FAQ.countDocuments({ isActive: true });
    const totalLogs  = await ChatLog.countDocuments();
    const topFAQs    = await FAQ.find({ isActive: true })
      .sort({ usageCount: -1 })
      .limit(5)
      .select('question usageCount category');
    return res.json({ totalFAQs, activeFAQs, totalLogs, topFAQs });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch analytics.' });
  }
};

module.exports = { getFAQs, createFAQ, updateFAQ, deleteFAQ, getChatLogs, getAnalytics };
