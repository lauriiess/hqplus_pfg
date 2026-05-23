const express = require('express');
const router  = express.Router();
const { getFAQs, createFAQ, updateFAQ, deleteFAQ, getChatLogs, getAnalytics } = require('../controllers/chatbotAdminController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);
router.use(authorizeRoles('super_admin', 'facility_admin'));

router.get('/faqs',        getFAQs);
router.post('/faqs',       createFAQ);
router.put('/faqs/:id',    updateFAQ);
router.delete('/faqs/:id', deleteFAQ);
router.get('/logs',        getChatLogs);
router.get('/analytics',   getAnalytics);

module.exports = router;
