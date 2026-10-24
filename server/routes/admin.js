const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { dashboard, getSettings, updateSettings, listPasses, listAuditLogs } = require('../controllers/adminController');
const { listRegistrations, approveRegistration, rejectRegistration, listUpdateRequests, approveUpdateRequest, rejectUpdateRequest } = require('../controllers/registrationController');

const router = express.Router();
router.use(authenticate, authorize('admin'));
router.get('/dashboard', asyncHandler(dashboard));
router.get('/settings', asyncHandler(getSettings));
router.put('/settings', asyncHandler(updateSettings));
router.get('/passes', asyncHandler(listPasses));
router.get('/audit-logs', asyncHandler(listAuditLogs));
router.get('/registration-requests', asyncHandler(listRegistrations));
router.patch('/registration-requests/:id/approve', asyncHandler(approveRegistration));
router.patch('/registration-requests/:id/reject', asyncHandler(rejectRegistration));
router.get('/employee-update-requests', asyncHandler(listUpdateRequests));
router.patch('/employee-update-requests/:id/approve', asyncHandler(approveUpdateRequest));
router.patch('/employee-update-requests/:id/reject', asyncHandler(rejectUpdateRequest));

module.exports = router;