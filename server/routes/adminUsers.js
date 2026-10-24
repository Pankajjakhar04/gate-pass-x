const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { listUsers, createUser, setUserActive } = require('../controllers/userController');

const router = express.Router();
router.use(authenticate, authorize('admin'));
router.get('/', asyncHandler(listUsers));
router.post('/', asyncHandler(createUser));
router.patch('/:id/status', asyncHandler(setUserActive));

module.exports = router;