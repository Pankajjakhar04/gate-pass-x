const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { checkIn, checkOut, listInside, listLogs } = require('../controllers/visitorLogController');

const router = express.Router();
router.use(authenticate);
router.post('/check-in', authorize('security'), asyncHandler(checkIn));
router.post('/check-out', authorize('security'), asyncHandler(checkOut));
router.get('/inside', authorize('security', 'admin'), asyncHandler(listInside));
router.get('/', authorize('security', 'admin'), asyncHandler(listLogs));

module.exports = router;