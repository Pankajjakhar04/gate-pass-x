const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { verify } = require('../controllers/verificationController');
const { verifyLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.post('/verify', authenticate, authorize('security', 'admin'), verifyLimiter, asyncHandler(verify));

module.exports = router;