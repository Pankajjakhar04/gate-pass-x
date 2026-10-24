const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { sweep } = require('../controllers/internalController');

const router = express.Router();
router.get('/sweep', asyncHandler(sweep));
router.post('/sweep', asyncHandler(sweep));

module.exports = router;