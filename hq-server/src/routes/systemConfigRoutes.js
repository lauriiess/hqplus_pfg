const express = require('express');
const router = express.Router();
const { getConfig, updateConfig, bulkUpdateConfig } = require('../controllers/systemConfigController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);
router.use(authorizeRoles('super_admin'));

router.get('/',         getConfig);
router.put('/bulk',     bulkUpdateConfig);
router.put('/:key',     updateConfig);

module.exports = router;
