const express = require('express');
const router  = express.Router();
const {
  getUsers, getUser, createUser, updateUser, deactivateUser,
  getMyPatientProfile, updateMyPatientProfile,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

// ── Patient's own profile (no admin required) ─────────────────────────────────
router.get('/profile', getMyPatientProfile);
router.put('/profile', updateMyPatientProfile);

// ── Admin-only user management ─────────────────────────────────────────────────
router.use(adminOnly);
router.get('/',            getUsers);
router.post('/',           createUser);
router.post('/create',     createUser);   // alias used by webapp
router.get('/:id',         getUser);
router.put('/:id',         updateUser);
router.delete('/:id',      deactivateUser);

module.exports = router;
