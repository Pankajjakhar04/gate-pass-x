const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requestUpload = require('../middleware/requestUpload');
const { submitRegistration } = require('../controllers/registrationController');

const { registrationLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.post('/', registrationLimiter, requestUpload, asyncHandler(submitRegistration));

module.exports = router;