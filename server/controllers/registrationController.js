const bcrypt = require('bcryptjs');
const { z } = require('zod');
const Employee = require('../models/Employee');
const EmployeeUpdateRequest = require('../models/EmployeeUpdateRequest');
const Pass = require('../models/Pass');
const RegistrationRequest = require('../models/RegistrationRequest');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../services/auditService');
const { uploadPhoto } = require('../services/imageService');
const { createEmployeePass, passView } = require('../services/passService');
const { privatePhotoUrl } = require('../config/cloudinary');

const registrationSchema = z.object({
  employeeId: z.string().min(1), fullName: z.string().min(2), department: z.string().min(1),
  presentAddress: z.string().min(5), permanentAddress: z.string().min(5), mobileNumber: z.string().min(7),
  email: z.string().email(), password: z.string().min(10)
});

function filesOf(req) {
  return { profilePhoto: req.files?.profilePhoto?.[0], idCard: req.files?.idCard?.[0], proof: req.files?.proof?.[0] };
}

function requestView(request) {
  const result = request.toObject ? request.toObject() : { ...request };
  if (result.profilePhoto?.key) result.profilePhoto.url = privatePhotoUrl(result.profilePhoto.key);
  if (result.idCard?.key) result.idCard.url = privatePhotoUrl(result.idCard.key);
  if (result.proof?.key) result.proof.url = privatePhotoUrl(result.proof.key);
  return result;
}

async function submitRegistration(req, res) {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid registration details', parsed.error.flatten());
  const files = filesOf(req);
  if (!files.profilePhoto || !files.idCard) throw new ApiError(422, 'DOCUMENTS_REQUIRED', 'Profile photo and ID card are required');
  const email = parsed.data.email.toLowerCase();
  const [existingUser, existingEmployee, existingRequest] = await Promise.all([
    User.findOne({ email }), Employee.findOne({ employeeId: parsed.data.employeeId }), RegistrationRequest.findOne({ $or: [{ email }, { employeeId: parsed.data.employeeId }], status: 'pending' })
  ]);
  if (existingUser || existingEmployee || existingRequest) throw new ApiError(409, 'DUPLICATE_REGISTRATION', 'An account or pending request already exists');
  const request = await RegistrationRequest.create({
    ...parsed.data,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    profilePhoto: await uploadPhoto(files.profilePhoto.buffer, `passes/registration/${parsed.data.employeeId}/profile`),
    idCard: await uploadPhoto(files.idCard.buffer, `passes/registration/${parsed.data.employeeId}/id-card`)
  });
  return res.status(201).json({ success: true, data: { id: request._id, status: request.status, message: 'Registration request submitted for admin approval' } });
}

async function listRegistrations(_req, res) {
  const requests = await RegistrationRequest.find({ status: 'pending' }).sort({ createdAt: 1 }).lean();
  return res.json({ success: true, data: requests.map(requestView) });
}

async function approveRegistration(req, res) {
  const registration = await RegistrationRequest.findById(req.params.id).select('+passwordHash');
  if (!registration) throw new ApiError(404, 'NOT_FOUND', 'Registration request not found');
  if (registration.status !== 'pending') throw new ApiError(409, 'REQUEST_ALREADY_REVIEWED', 'Registration request was already reviewed');
  const [existingUser, existingEmployee] = await Promise.all([User.findOne({ email: registration.email }), Employee.findOne({ employeeId: registration.employeeId })]);
  if (existingUser || existingEmployee) throw new ApiError(409, 'DUPLICATE_ACCOUNT', 'An employee account already exists');
  const employee = await Employee.create({ employeeId: registration.employeeId, name: registration.fullName, department: registration.department, phone: registration.mobileNumber, email: registration.email, presentAddress: registration.presentAddress, permanentAddress: registration.permanentAddress, photo: registration.profilePhoto, idCard: registration.idCard });
  let user;
  try {
    user = await User.create({ email: registration.email, passwordHash: registration.passwordHash, role: 'employee', employee: employee._id, isActive: true });
    const validUntil = new Date(); validUntil.setFullYear(validUntil.getFullYear() + 1);
    const pass = await createEmployeePass({ employee, createdBy: req.user._id, validUntil });
    registration.status = 'approved'; registration.reviewedBy = req.user._id; registration.reviewedAt = new Date(); await registration.save();
    await writeAudit({ action: 'EMPLOYEE_REGISTRATION_APPROVED', actor: req.user._id, actorRole: req.user.role, targetType: 'Employee', targetId: employee._id.toString(), outcome: 'success', ip: req.ip });
    return res.json({ success: true, data: { employee, user: { id: user._id, email: user.email, role: user.role }, pass: passView({ ...pass.toObject(), employee }, true) } });
  } catch (error) {
    if (user?._id) await User.deleteOne({ _id: user._id });
    await Employee.deleteOne({ _id: employee._id });
    throw error;
  }
}

async function rejectRegistration(req, res) {
  const registration = await RegistrationRequest.findById(req.params.id);
  if (!registration) throw new ApiError(404, 'NOT_FOUND', 'Registration request not found');
  if (registration.status !== 'pending') throw new ApiError(409, 'REQUEST_ALREADY_REVIEWED', 'Registration request was already reviewed');
  registration.status = 'rejected'; registration.reviewedBy = req.user._id; registration.reviewedAt = new Date(); registration.rejectionReason = req.body.reason || 'Rejected by admin'; await registration.save();
  await writeAudit({ action: 'EMPLOYEE_REGISTRATION_REJECTED', actor: req.user._id, actorRole: req.user.role, targetType: 'RegistrationRequest', targetId: registration._id.toString(), outcome: 'success', ip: req.ip });
  return res.json({ success: true, data: { id: registration._id, status: registration.status } });
}

async function listUpdateRequests(_req, res) {
  const requests = await EmployeeUpdateRequest.find({ status: 'pending' }).sort({ createdAt: 1 }).populate('employee').lean();
  return res.json({ success: true, data: requests.map(requestView) });
}

async function approveUpdateRequest(req, res) {
  const updateRequest = await EmployeeUpdateRequest.findById(req.params.id);
  if (!updateRequest) throw new ApiError(404, 'NOT_FOUND', 'Update request not found');
  if (updateRequest.status !== 'pending') throw new ApiError(409, 'REQUEST_ALREADY_REVIEWED', 'Update request was already reviewed');
  const employee = await Employee.findById(updateRequest.employee);
  if (!employee) throw new ApiError(404, 'NOT_FOUND', 'Employee not found');
  const changes = updateRequest.changes || {};
  Object.assign(employee, changes);
  await employee.save();
  updateRequest.status = 'approved'; updateRequest.reviewedBy = req.user._id; updateRequest.reviewedAt = new Date(); await updateRequest.save();
  if (changes.email) await User.updateOne({ employee: employee._id }, { email: changes.email.toLowerCase() });
  await writeAudit({ action: 'EMPLOYEE_UPDATE_APPROVED', actor: req.user._id, actorRole: req.user.role, targetType: 'Employee', targetId: employee._id.toString(), outcome: 'success', ip: req.ip, meta: { changes } });
  return res.json({ success: true, data: employee });
}

async function rejectUpdateRequest(req, res) {
  const updateRequest = await EmployeeUpdateRequest.findById(req.params.id);
  if (!updateRequest) throw new ApiError(404, 'NOT_FOUND', 'Update request not found');
  if (updateRequest.status !== 'pending') throw new ApiError(409, 'REQUEST_ALREADY_REVIEWED', 'Update request was already reviewed');
  updateRequest.status = 'rejected'; updateRequest.reviewedBy = req.user._id; updateRequest.reviewedAt = new Date(); updateRequest.rejectionReason = req.body.reason || 'Rejected by admin'; await updateRequest.save();
  await writeAudit({ action: 'EMPLOYEE_UPDATE_REJECTED', actor: req.user._id, actorRole: req.user.role, targetType: 'EmployeeUpdateRequest', targetId: updateRequest._id.toString(), outcome: 'success', ip: req.ip });
  return res.json({ success: true, data: { id: updateRequest._id, status: updateRequest.status } });
}

module.exports = { submitRegistration, listRegistrations, approveRegistration, rejectRegistration, listUpdateRequests, approveUpdateRequest, rejectUpdateRequest };