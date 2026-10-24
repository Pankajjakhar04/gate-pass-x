const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../services/auditService');

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  role: z.enum(['admin', 'employee', 'security']),
  employee: z.string().optional()
});

async function listUsers(_req, res) {
  const users = await User.find().select('email role employee isActive lastLoginAt createdAt').sort({ createdAt: -1 });
  return res.json({ success: true, data: users });
}

async function createUser(req, res) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid user data', parsed.error.flatten());
  }

  if (parsed.data.role === 'admin') {
    const seedAdmin = (process.env.SEED_ADMIN_EMAIL || '').toLowerCase();
    if (seedAdmin && req.user.email.toLowerCase() !== seedAdmin) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the primary administrator can create admin accounts');
    }
  }

  if (parsed.data.role === 'employee' && !parsed.data.employee) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Employee accounts must be created with an associated employee record');
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await User.create({ ...parsed.data, passwordHash });
  await writeAudit({
    action: 'USER_CREATED', actor: req.user._id, actorRole: req.user.role,
    targetType: 'User', targetId: user._id.toString(), outcome: 'success', ip: req.ip
  });

  return res.status(201).json({ success: true, data: { id: user._id, email: user.email, role: user.role, isActive: user.isActive } });
}

async function setUserActive(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  if (user._id.equals(req.user._id) && req.body.isActive === false) {
    throw new ApiError(409, 'SELF_DEACTIVATION', 'You cannot deactivate your own account');
  }
  if (typeof req.body.isActive !== 'boolean') {
    throw new ApiError(422, 'VALIDATION_ERROR', 'isActive must be boolean');
  }

  user.isActive = req.body.isActive;
  await user.save();
  const action = user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
  await writeAudit({
    action, actor: req.user._id, actorRole: req.user.role,
    targetType: 'User', targetId: user._id.toString(), outcome: 'success', ip: req.ip
  });

  return res.json({ success: true, data: { id: user._id, isActive: user.isActive } });
}

module.exports = { listUsers, createUser, setUserActive };