const express = require('express');
const router = express.Router();
const { getStaff, getStaffMember, updateStaff, deactivateStaff } = require('../controllers/staffController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);
router.use(authorizeRoles('super_admin', 'facility_admin'));

router.get('/',       getStaff);
router.get('/:id',    getStaffMember);
router.put('/:id',    updateStaff);
router.delete('/:id', deactivateStaff);

module.exports = router;
