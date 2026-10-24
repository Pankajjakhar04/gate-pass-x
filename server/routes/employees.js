const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const upload = require('../middleware/upload');
const { createEmployee, listEmployees, getEmployeeDetails, getMe, setEmployeeActive, updateEmployee, submitProfileUpdateRequest, requestUpload } = require('../controllers/employeeController');

const router = express.Router();
router.get('/me', authenticate, authorize('employee'), asyncHandler(getMe));
router.post('/me/update-request', authenticate, authorize('employee'), requestUpload, asyncHandler(submitProfileUpdateRequest));
router.use(authenticate, authorize('admin'));
router.get('/', asyncHandler(listEmployees));
router.post('/', upload.single('photo'), asyncHandler(createEmployee));
router.get('/:id', asyncHandler(getEmployeeDetails));
router.patch('/:id/status', asyncHandler(setEmployeeActive));
router.patch('/:id', requestUpload, asyncHandler(updateEmployee));

module.exports = router;