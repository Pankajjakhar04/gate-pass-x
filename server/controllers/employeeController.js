const bcrypt = require('bcryptjs');
const { z } = require('zod');
const Employee = require('../models/Employee');
const Pass = require('../models/Pass');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../services/auditService');
const { uploadPhoto } = require('../services/imageService');
const { createEmployeePass, passView } = require('../services/passService');
const { privatePhotoUrl } = require('../config/cloudinary');
const EmployeeUpdateRequest = require('../models/EmployeeUpdateRequest');
const requestUpload = require('../middleware/requestUpload');

const employeeSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1),
  department: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email(),
  residentialUnit: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(10)
});

const employeeUpdateSchema = z.object({
  employeeId: z.string().min(1).optional(), name: z.string().min(2).optional(), department: z.string().min(1).optional(),
  phone: z.string().min(7).optional(), email: z.string().email().optional(), residentialUnit: z.string().optional(),
  address: z.string().optional(), presentAddress: z.string().optional(), permanentAddress: z.string().optional(), password: z.string().min(10).optional()
});

const profileRequestSchema = z.object({
  name: z.string().min(2).optional(), department: z.string().min(1).optional(), phone: z.string().min(7).optional(),
  email: z.string().email().optional(), presentAddress: z.string().min(5).optional(), permanentAddress: z.string().min(5).optional()
});

function employeeView(employee) {
  if (!employee) return employee;
  const result = employee.toObject ? employee.toObject() : { ...employee };
  if (result.photo?.key) result.photo.url = privatePhotoUrl(result.photo.key);
  if (result.idCard?.key) result.idCard.url = privatePhotoUrl(result.idCard.key);
  return result;
}

async function createEmployee(req, res) {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid employee data', parsed.error.flatten());

  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) throw new ApiError(409, 'DUPLICATE_EMAIL', 'A user with this email already exists');

  const employeeData = { ...parsed.data };
  delete employeeData.password;
  employeeData.email = employeeData.email.toLowerCase();
  if (req.file) employeeData.photo = await uploadPhoto(req.file.buffer, `passes/employees/${parsed.data.employeeId}`);

  const employee = await Employee.create(employeeData);
  let user;
  try {
    user = await User.create({
      email: employee.email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: 'employee',
      employee: employee._id,
      isActive: true
    });
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);
    const pass = await createEmployeePass({ employee, createdBy: req.user._id, validUntil });
    await writeAudit({ action: 'EMPLOYEE_CREATED', actor: req.user._id, actorRole: req.user.role, targetType: 'Employee', targetId: employee._id.toString(), outcome: 'success', ip: req.ip });
    return res.status(201).json({ success: true, data: { employee: employeeView(employee), user: { id: user._id, email: user.email, role: user.role }, pass: passView({ ...pass.toObject(), employee }, true) } });
  } catch (error) {
    if (user?._id) await User.deleteOne({ _id: user._id });
    await Employee.deleteOne({ _id: employee._id });
    throw error;
  }
}

async function listEmployees(req, res) {
  const page = parseInt(req.query.page, 10);
  const limit = parseInt(req.query.limit, 10);

  if (!isNaN(page) && !isNaN(limit) && page > 0 && limit > 0) {
    const total = await Employee.countDocuments();
    const skip = (page - 1) * limit;
    const employees = await Employee.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return res.json({
      success: true,
      data: employees.map(employeeView),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }

  const employees = await Employee.find().sort({ createdAt: -1 }).lean();
  return res.json({ success: true, data: employees.map(employeeView) });
}

async function getEmployeeDetails(req, res) {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new ApiError(404, 'NOT_FOUND', 'Employee not found');
  const [user, passes] = await Promise.all([
    User.findOne({ employee: employee._id }).select('email role isActive lastLoginAt').lean(),
    Pass.find({ employee: employee._id }).sort({ generatedAt: -1 }).select('+qrTokenEncrypted').populate('employee').populate('visitor', 'name phone purpose photo').populate('dependent', 'name relationship status photo')
  ]);
  const passViews = passes.map((pass) => {
    const view = passView(pass, true);
    if (pass.visitor) view.visitor = pass.visitor;
    if (pass.dependent) view.dependent = pass.dependent;
    return view;
  });
  return res.json({ success: true, data: { employee: employeeView(employee), user, passes: passViews } });
}

async function getMe(req, res) {
  const employee = await Employee.findById(req.user.employee);
  if (!employee) throw new ApiError(404, 'NOT_FOUND', 'Employee profile not found');
  const pass = await Pass.findOne({ employee: employee._id, passType: 'employee', status: { $in: ['active', 'expired'] } })
    .populate('employee').select('+qrTokenEncrypted');
  return res.json({ success: true, data: { employee: employeeView(employee), pass: pass ? passView(pass, true) : null } });
}

async function setEmployeeActive(req, res) {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new ApiError(404, 'NOT_FOUND', 'Employee not found');
  if (typeof req.body.isActive !== 'boolean') throw new ApiError(422, 'VALIDATION_ERROR', 'isActive must be boolean');
  employee.isActive = req.body.isActive;
  await employee.save();
  await User.updateOne({ employee: employee._id }, { isActive: employee.isActive });
  await writeAudit({ action: employee.isActive ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED', actor: req.user._id, actorRole: req.user.role, targetType: 'Employee', targetId: employee._id.toString(), outcome: 'success', ip: req.ip });
  return res.json({ success: true, data: { id: employee._id, isActive: employee.isActive } });
}

async function updateEmployee(req, res) {
  const parsed = employeeUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid employee details', parsed.error.flatten());
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new ApiError(404, 'NOT_FOUND', 'Employee not found');
  const changes = { ...parsed.data };
  const password = changes.password; delete changes.password;
  if (changes.email) changes.email = changes.email.toLowerCase();
  if (req.files?.profilePhoto?.[0]) changes.photo = await uploadPhoto(req.files.profilePhoto[0].buffer, `passes/employees/${employee.employeeId}`);
  if (req.files?.idCard?.[0]) changes.idCard = await uploadPhoto(req.files.idCard[0].buffer, `passes/employees/${employee.employeeId}/id-card`);
  Object.assign(employee, changes); await employee.save();
  const userChanges = {}; if (changes.email) userChanges.email = changes.email; if (password) userChanges.passwordHash = await bcrypt.hash(password, 12); if (Object.keys(userChanges).length) await User.updateOne({ employee: employee._id }, userChanges);
  await writeAudit({ action: 'EMPLOYEE_UPDATED', actor: req.user._id, actorRole: req.user.role, targetType: 'Employee', targetId: employee._id.toString(), outcome: 'success', ip: req.ip, meta: { fields: Object.keys(changes).concat(password ? ['password'] : []) } });
  return res.json({ success: true, data: employeeView(employee) });
}

async function submitProfileUpdateRequest(req, res) {
  const parsed = profileRequestSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid profile update details', parsed.error.flatten());
  if (!Object.keys(parsed.data).length && !req.files?.proof?.[0]) throw new ApiError(422, 'VALIDATION_ERROR', 'Provide at least one detail to update');
  const employee = await Employee.findById(req.user.employee);
  if (!employee) throw new ApiError(404, 'NOT_FOUND', 'Employee profile not found');
  const pending = await EmployeeUpdateRequest.findOne({ employee: employee._id, status: 'pending' });
  if (pending) throw new ApiError(409, 'UPDATE_REQUEST_PENDING', 'An update request is already awaiting approval');
  const changes = { ...parsed.data }; if (changes.email) changes.email = changes.email.toLowerCase();
  const proof = req.files?.proof?.[0] ? await uploadPhoto(req.files.proof[0].buffer, `passes/employees/${employee.employeeId}/update-proof`) : undefined;
  const updateRequest = await EmployeeUpdateRequest.create({ employee: employee._id, changes, proof });
  await writeAudit({ action: 'EMPLOYEE_UPDATE_REQUESTED', actor: req.user._id, actorRole: req.user.role, targetType: 'EmployeeUpdateRequest', targetId: updateRequest._id.toString(), outcome: 'success', ip: req.ip });
  return res.status(201).json({ success: true, data: { id: updateRequest._id, status: updateRequest.status } });
}

module.exports = { createEmployee, listEmployees, getEmployeeDetails, getMe, setEmployeeActive, updateEmployee, submitProfileUpdateRequest, requestUpload };