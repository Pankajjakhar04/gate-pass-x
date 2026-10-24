const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const upload = require('../middleware/upload');
const { createDependent, listDependents, approveDependent, createPass, updateDependent, deleteDependent } = require('../controllers/dependentController');

const router = express.Router();
router.use(authenticate);
router.get('/', authorize('employee', 'admin'), asyncHandler(listDependents));
router.post('/', authorize('employee'), upload.single('photo'), asyncHandler(createDependent));
router.post('/:id/pass', authorize('employee', 'admin'), asyncHandler(createPass));
router.patch('/:id', authorize('employee', 'admin'), upload.single('photo'), asyncHandler(updateDependent));
router.delete('/:id', authorize('employee', 'admin'), asyncHandler(deleteDependent));
router.patch('/:id/approve', authorize('admin'), asyncHandler(approveDependent));

module.exports = router;