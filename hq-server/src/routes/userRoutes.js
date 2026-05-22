const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  getMyPatientProfile,
  updateMyPatientProfile,
} = require('../controllers/userController');
const { protect, authorizeRoles, adminOnly } = require('../middleware/auth');

router.use(protect);

// Patient profile routes
router.get('/me/patient-profile',    authorizeRoles('patient'), getMyPatientProfile);
router.put('/me/patient-profile',    authorizeRoles('patient'), updateMyPatientProfile);

// Admin routes
router.get('/',       adminOnly, getUsers);
router.post('/',      adminOnly, createUser);
router.get('/:id',    adminOnly, getUser);
router.put('/:id',    adminOnly, updateUser);
router.delete('/:id', adminOnly, deactivateUser);

module.exports = router;
