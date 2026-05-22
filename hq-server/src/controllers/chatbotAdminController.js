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
    const faqs = await FAQ.find(filter).sort({ category: 1, createdAt: -1 });
    return res.json(faqs);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch FAQs.' });
  }
};

const createFAQ = async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    if (!question || !answer) return res.status(400).json({ message: 'Question and answer are required.' });
    const faq = await FAQ.create({ question: question.trim(), answer: answer.trim(), category: category || 'General', createdBy: req.user._id });
    return res.status(201).json(faq);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create FAQ.' });
  }
};

const updateFAQ = async (req, res) => {
  try {
    const allowed = ['question', 'answer', 'category', 'isActive'];
    const update = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
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
    const logs = await ChatLog.find({})
      .populate('patient', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit);
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch chat logs.' });
  }
};

module.exports = { getFAQs, createFAQ, updateFAQ, deleteFAQ, getChatLogs };
