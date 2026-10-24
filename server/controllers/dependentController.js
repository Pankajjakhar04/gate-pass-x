const mongoose = require('mongoose');
const { z } = require('zod');
const Dependent = require('../models/Dependent');
const Employee = require('../models/Employee');
const Pass = require('../models/Pass');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../services/auditService');
const { uploadPhoto } = require('../services/imageService');
const { getSetting } = require('../services/settingService');
const { createDependentPass, passView } = require('../services/passService');
const { privatePhotoUrl } = require('../config/cloudinary');

const dependentSchema = z.object({
  name: z.string().trim().min(1),
  relationship: z.string().trim().min(1)
});

function dependentView(dependent) {
  const result = dependent.toObject ? dependent.toObject() : { ...dependent };
  if (result.photo?.key) result.photo.url = privatePhotoUrl(result.photo.key);
  return result;
}

async function employeeForUser(user) {
  let employee = null;
  if (user.employee) {
    employee = await Employee.findById(user.employee);
  }
  if (!employee && user.email) {
    employee = await Employee.findOne({ email: user.email.toLowerCase() });
  }
  if (!employee || !employee.isActive) throw new ApiError(403, 'INACTIVE_EMPLOYEE', 'Employee account is inactive or not found');
  return employee;
}

async function createDependent(req, res) {
  const parsed = dependentSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid dependent data', parsed.error.flatten());
  const employee = await employeeForUser(req.user);
  const approvalRequired = await getSetting('dependentApprovalRequired');
  const data = { ...parsed.data, employee: employee._id, status: approvalRequired ? 'pending' : 'approved' };
  if (!approvalRequired) {
    data.approvedBy = req.user._id;
    data.approvedAt = new Date();
  }
  if (req.file) data.photo = await uploadPhoto(req.file.buffer, `passes/dependents/${employee.employeeId}`);
  const dependent = await Dependent.create(data);
  await writeAudit({ action: 'DEPENDENT_CREATED', actor: req.user._id, actorRole: req.user.role, targetType: 'Dependent', targetId: dependent._id.toString(), outcome: 'success', ip: req.ip });
  return res.status(201).json({ success: true, data: dependentView(dependent) });
}

async function listDependents(req, res) {
  let query = {};
  if (req.user.role === 'admin') {
    if (req.query.employeeId) query = { employee: req.query.employeeId };
  } else {
    const employee = await employeeForUser(req.user);
    query = { employee: employee._id };
  }
  const dependents = await Dependent.find(query).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, data: dependents.map(dependentView) });
}

async function approveDependent(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(404, 'NOT_FOUND', 'Dependent not found');
  const dependent = await Dependent.findById(req.params.id);
  if (!dependent) throw new ApiError(404, 'NOT_FOUND', 'Dependent not found');
  if (typeof req.body.approved !== 'boolean') throw new ApiError(422, 'VALIDATION_ERROR', 'approved must be boolean');
  dependent.status = req.body.approved ? 'approved' : 'rejected';
  dependent.approvedBy = req.body.approved ? req.user._id : undefined;
  dependent.approvedAt = req.body.approved ? new Date() : undefined;
  await dependent.save();
  await writeAudit({ action: req.body.approved ? 'DEPENDENT_APPROVED' : 'DEPENDENT_REJECTED', actor: req.user._id, actorRole: req.user.role, targetType: 'Dependent', targetId: dependent._id.toString(), outcome: 'success', ip: req.ip });
  return res.json({ success: true, data: dependentView(dependent) });
}

async function createPass(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(404, 'NOT_FOUND', 'Dependent not found');
  const dependent = await Dependent.findById(req.params.id).populate('employee');
  if (!dependent) throw new ApiError(404, 'NOT_FOUND', 'Dependent not found');
  if (req.user.role === 'employee') {
    const employee = await employeeForUser(req.user);
    const depEmployeeId = dependent.employee?._id || dependent.employee;
    if (!depEmployeeId || String(depEmployeeId) !== String(employee._id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this dependent');
    }
  }
  if (dependent.status !== 'approved') throw new ApiError(409, 'DEPENDENT_NOT_APPROVED', 'Dependent must be approved before a pass can be created');
  const existing = await Pass.findOne({ dependent: dependent._id, status: { $in: ['active', 'pending'] } }).select('+qrTokenEncrypted');
  if (existing) return res.json({ success: true, data: { ...passView(existing, req.user.role === 'employee' || req.user.role === 'admin'), dependent: dependentView(dependent) } });
  const validityDays = Number(await getSetting('dependentValidityDays'));
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);
  const employeeDoc = dependent.employee?._id ? dependent.employee : await Employee.findById(dependent.employee);
  const pass = await createDependentPass({ employee: employeeDoc, dependent, createdBy: req.user._id, validUntil });
  await writeAudit({ action: 'PASS_CREATED', actor: req.user._id, actorRole: req.user.role, targetType: 'Pass', targetId: pass._id.toString(), outcome: 'success', ip: req.ip, meta: { passType: 'dependent' } });
  return res.status(201).json({ success: true, data: { ...passView(pass, true), dependent: dependentView(dependent) } });
}

const dependentUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  relationship: z.string().trim().min(1).optional()
});

async function updateDependent(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(404, 'NOT_FOUND', 'Dependent not found');
  const parsed = dependentUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid dependent data', parsed.error.flatten());
  const dependent = await Dependent.findById(req.params.id);
  if (!dependent) throw new ApiError(404, 'NOT_FOUND', 'Dependent not found');
  if (req.user.role === 'employee') {
    const employee = await employeeForUser(req.user);
    const depEmployeeId = dependent.employee?._id || dependent.employee;
    if (!depEmployeeId || String(depEmployeeId) !== String(employee._id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to edit this dependent');
    }
  }
  const changes = { ...parsed.data };
  if (req.file) {
    const employee = await Employee.findById(dependent.employee);
    changes.photo = await uploadPhoto(req.file.buffer, `passes/dependents/${employee ? employee.employeeId : 'general'}`);
  }
  if (!Object.keys(changes).length) throw new ApiError(422, 'VALIDATION_ERROR', 'Provide at least one field to update');
  Object.assign(dependent, changes);
  await dependent.save();
  await writeAudit({ action: 'DEPENDENT_UPDATED', actor: req.user._id, actorRole: req.user.role, targetType: 'Dependent', targetId: dependent._id.toString(), outcome: 'success', ip: req.ip, meta: { fields: Object.keys(changes) } });
  return res.json({ success: true, data: dependentView(dependent) });
}

async function deleteDependent(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(404, 'NOT_FOUND', 'Dependent not found');
  const dependent = await Dependent.findById(req.params.id);
  if (!dependent) throw new ApiError(404, 'NOT_FOUND', 'Dependent not found');
  if (req.user.role === 'employee') {
    const employee = await employeeForUser(req.user);
    const depEmployeeId = dependent.employee?._id || dependent.employee;
    if (!depEmployeeId || String(depEmployeeId) !== String(employee._id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to delete this dependent');
    }
  }
  // Remove all passes associated with this dependent
  await Pass.deleteMany({ dependent: dependent._id });
  await Dependent.deleteOne({ _id: dependent._id });
  await writeAudit({ action: 'DEPENDENT_DELETED', actor: req.user._id, actorRole: req.user.role, targetType: 'Dependent', targetId: dependent._id.toString(), outcome: 'success', ip: req.ip });
  return res.json({ success: true, data: { id: dependent._id, deleted: true } });
}

module.exports = { createDependent, listDependents, approveDependent, createPass, updateDependent, deleteDependent };