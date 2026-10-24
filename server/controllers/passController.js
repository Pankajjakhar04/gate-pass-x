const { z } = require('zod');
const Employee = require('../models/Employee');
const Pass = require('../models/Pass');
const Visitor = require('../models/Visitor');
const VisitorLog = require('../models/VisitorLog');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../services/auditService');
const { uploadPhoto } = require('../services/imageService');
const { getSettings } = require('../services/settingService');
const { createVisitorPass, passView } = require('../services/passService');
const { privatePhotoUrl } = require('../config/cloudinary');

const visitorSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  purpose: z.string().optional(),
  validityHours: z.coerce.number().positive().optional()
});

function visitorView(visitor) {
  const result = visitor.toObject ? visitor.toObject() : { ...visitor };
  if (result.photo?.key) result.photo.url = privatePhotoUrl(result.photo.key);
  return result;
}

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

async function createVisitorPassController(req, res) {
  const parsed = visitorSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid visitor data', parsed.error.flatten());
  if (!req.file) throw new ApiError(422, 'PHOTO_REQUIRED', 'A visitor photo is required');
  const employee = await employeeForUser(req.user);

  // Batch load all required settings in a single query (Issue #20)
  const settings = await getSettings([
    'maxActiveVisitorPassesPerEmployee',
    'visitorValidityHours',
    'allowMultiEntry'
  ]);

  const activeLimit = Number(settings.maxActiveVisitorPassesPerEmployee);
  const activeCount = await Pass.countDocuments({ employee: employee._id, passType: 'visitor', status: 'active', validUntil: { $gt: new Date() } });
  if (activeCount >= activeLimit) throw new ApiError(409, 'ACTIVE_PASS_LIMIT', 'Active visitor pass limit reached');

  const configuredHours = Number(settings.visitorValidityHours);
  const validityHours = Math.min(parsed.data.validityHours || configuredHours, configuredHours);
  const visitor = await Visitor.create({ ...parsed.data, referenceEmployee: employee._id, photo: await uploadPhoto(req.file.buffer, `passes/visitors/${employee.employeeId}`) });
  try {
    const validUntil = new Date(Date.now() + validityHours * 60 * 60 * 1000);
    const pass = await createVisitorPass({
      employee,
      visitor,
      createdBy: req.user._id,
      validUntil,
      maxEntries: settings.allowMultiEntry ? 0 : 1
    });
    await writeAudit({ action: 'PASS_CREATED', actor: req.user._id, actorRole: req.user.role, targetType: 'Pass', targetId: pass._id.toString(), outcome: 'success', ip: req.ip, meta: { passType: 'visitor', visitorId: visitor._id.toString() } });
    return res.status(201).json({ success: true, data: { visitor: visitorView(visitor), pass: passView(pass, true) } });
  } catch (error) {
    await Visitor.deleteOne({ _id: visitor._id });
    throw error;
  }
}

async function listOwnPasses(req, res) {
  const employee = await employeeForUser(req.user);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const [passes, total] = await Promise.all([
    Pass.find({ employee: employee._id }).sort({ generatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('visitor').populate('dependent').select('+qrTokenEncrypted'),
    Pass.countDocuments({ employee: employee._id })
  ]);
  const employeeData = { _id: employee._id, employeeId: employee.employeeId, name: employee.name, department: employee.department, photo: employee.photo?.key ? { key: employee.photo.key, url: privatePhotoUrl(employee.photo.key) } : employee.photo };
  return res.json({ success: true, data: passes.map((pass) => ({ ...passView(pass, true), employee: employeeData, visitor: pass.visitor ? visitorView(pass.visitor) : undefined, dependent: pass.dependent ? dependentView(pass.dependent) : undefined })), meta: { page, limit, total } });
}

async function revokePass(req, res) {
  const pass = await Pass.findOne({ passId: req.params.passId });
  if (!pass) throw new ApiError(404, 'NOT_FOUND', 'Pass not found');
  if (req.user.role === 'employee') {
    const employee = await employeeForUser(req.user);
    const passEmpId = pass.employee?._id || pass.employee;
    if (!passEmpId || String(passEmpId) !== String(employee._id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to revoke this pass');
    }
  }
  if (pass.status !== 'revoked') {
    pass.status = 'revoked'; pass.revokedAt = new Date(); pass.revokedBy = req.user._id; pass.revokeReason = req.body.reason || 'Revoked by owner'; await pass.save();
    await writeAudit({ action: 'PASS_REVOKED', actor: req.user._id, actorRole: req.user.role, targetType: 'Pass', targetId: pass._id.toString(), outcome: 'success', ip: req.ip, meta: { reason: pass.revokeReason } });
  }
  return res.json({ success: true, data: { passId: pass.passId, status: pass.status, revokedAt: pass.revokedAt } });
}

async function deletePass(req, res) {
  const pass = await Pass.findOne({ passId: req.params.passId });
  if (!pass) throw new ApiError(404, 'NOT_FOUND', 'Pass not found');
  if (req.user.role === 'employee') {
    const employee = await employeeForUser(req.user);
    const passEmpId = pass.employee?._id || pass.employee;
    if (!passEmpId || String(passEmpId) !== String(employee._id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to delete this pass');
    }
  }
  // Check if visitor is currently inside premises
  const activeLog = await VisitorLog.findOne({ pass: pass._id, checkOutAt: null });
  if (activeLog) {
    throw new ApiError(409, 'VISITOR_CURRENTLY_INSIDE', 'Cannot delete pass while visitor is inside the premises. Please check out first.');
  }
  const passId = pass.passId;
  // Clean up associated visitor record if this was a visitor pass
  if (pass.passType === 'visitor' && pass.visitor) {
    await Visitor.deleteOne({ _id: pass.visitor });
  }
  await VisitorLog.deleteMany({ pass: pass._id });
  await Pass.deleteOne({ _id: pass._id });
  await writeAudit({ action: 'PASS_DELETED', actor: req.user._id, actorRole: req.user.role, targetType: 'Pass', targetId: pass._id.toString(), outcome: 'success', ip: req.ip, meta: { passId } });
  return res.json({ success: true, data: { passId, deleted: true } });
}

module.exports = { createVisitorPassController, listOwnPasses, revokePass, deletePass };