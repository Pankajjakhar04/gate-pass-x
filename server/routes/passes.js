const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const upload = require('../middleware/upload');
const { createVisitorPassController, listOwnPasses, revokePass, deletePass } = require('../controllers/passController');

const router = express.Router();
router.use(authenticate);
router.post('/visitor', authorize('employee'), upload.single('photo'), asyncHandler(createVisitorPassController));
router.get('/', authorize('employee'), asyncHandler(listOwnPasses));
router.post('/:passId/revoke', authorize('employee', 'admin'), asyncHandler(revokePass));
router.delete('/:passId', authorize('employee', 'admin'), asyncHandler(deletePass));

module.exports = router;