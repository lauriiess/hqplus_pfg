const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, deactivateUser } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.use(adminOnly);

router.get('/',            getUsers);
router.post('/',           createUser);
router.post('/create',     createUser);   // alias used by webapp
router.get('/:id',         getUser);
router.put('/:id',         updateUser);
router.delete('/:id',      deactivateUser);

module.exports = router;
