const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../services/auditService');

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Email and password are required', parsed.error.flatten());
  }

  const user = await User.findOne({ email: parsed.data.email }).select('+passwordHash');
  const passwordMatches = user && await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!user || !passwordMatches || !user.isActive) {
    await writeAudit({
      action: 'LOGIN_FAILED',
      targetType: 'User',
      targetId: user?._id?.toString(),
      outcome: 'failure',
      ip: req.ip,
      meta: { email: parsed.data.email }
    });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, employee: user.employee?.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  await writeAudit({
    action: 'LOGIN_SUCCESS',
    actor: user._id,
    actorRole: user.role,
    targetType: 'User',
    targetId: user._id.toString(),
    outcome: 'success',
    ip: req.ip
  });

  return res.json({
    success: true,
    data: {
      token,
      user: { id: user._id, email: user.email, role: user.role, employee: user.employee }
    }
  });
}

async function me(req, res) {
  return res.json({
    success: true,
    data: { id: req.user._id, email: req.user.email, role: req.user.role, employee: req.user.employee }
  });
}

module.exports = { login, me };