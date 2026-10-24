const { z } = require('zod');
const Pass = require('../models/Pass');
const Visitor = require('../models/Visitor');
const VisitorLog = require('../models/VisitorLog');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../services/auditService');
const { verifyPass } = require('../services/verificationService');

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const logSchema = z.object({ passId: z.string().min(1), notes: z.string().optional() });

async function checkIn(req, res) {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'passId is required');
  const verification = await verifyPass({ passId: parsed.data.passId, actor: req.user, ip: req.ip });
  if (!verification.valid) throw new ApiError(409, verification.code, verification.message);
  if (verification.pass.passType !== 'visitor') throw new ApiError(422, 'NOT_VISITOR_PASS', 'Only visitor passes can be checked in');
  if (verification.nextAction !== 'check-in') throw new ApiError(409, 'ALREADY_INSIDE', 'Visitor is already inside');
  const pass = await Pass.findOne({ passId: parsed.data.passId }).populate('visitor');
  try {
    const log = await VisitorLog.create({ pass: pass._id, visitor: pass.visitor._id, securityUser: req.user._id, notes: parsed.data.notes });
    await writeAudit({ action: 'VISITOR_CHECK_IN', actor: req.user._id, actorRole: req.user.role, targetType: 'VisitorLog', targetId: log._id.toString(), outcome: 'success', ip: req.ip });
    return res.status(201).json({ success: true, data: log });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'ALREADY_INSIDE', 'Visitor is already inside');
    throw error;
  }
}

async function checkOut(req, res) {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'passId is required');
  const pass = await Pass.findOne({ passId: parsed.data.passId });
  if (!pass) throw new ApiError(404, 'NOT_FOUND', 'Pass not found');
  const log = await VisitorLog.findOne({ pass: pass._id, checkOutAt: null });
  if (!log) throw new ApiError(409, 'NOT_INSIDE', 'Visitor is not currently inside');
  log.checkOutAt = new Date();
  if (parsed.data.notes) log.notes = parsed.data.notes;
  await log.save();
  await writeAudit({ action: 'VISITOR_CHECK_OUT', actor: req.user._id, actorRole: req.user.role, targetType: 'VisitorLog', targetId: log._id.toString(), outcome: 'success', ip: req.ip });
  return res.json({ success: true, data: log });
}

async function listInside(_req, res) {
  const logs = await VisitorLog.find({ checkOutAt: null }).sort({ checkInAt: -1 }).populate('visitor').populate('pass').lean();
  return res.json({ success: true, data: logs });
}

async function listLogs(req, res) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const query = {};
  if (req.query.from || req.query.to) query.checkInAt = { ...(req.query.from ? { $gte: new Date(req.query.from) } : {}), ...(req.query.to ? { $lte: new Date(req.query.to) } : {}) };
  if (req.query.status === 'inside') query.checkOutAt = null;
  if (req.query.status === 'checked-out') query.checkOutAt = { $ne: null };
  if (req.query.q) {
    const safeQuery = escapeRegex(String(req.query.q).trim());
    const [visitors, passes] = await Promise.all([
      Visitor.find({ name: { $regex: safeQuery, $options: 'i' } }).select('_id').lean(),
      Pass.find({ passId: { $regex: safeQuery, $options: 'i' } }).select('_id').lean()
    ]);
    query.$or = [{ visitor: { $in: visitors.map((visitor) => visitor._id) } }, { pass: { $in: passes.map((pass) => pass._id) } }];
  }
  const [logs, total] = await Promise.all([
    VisitorLog.find(query).sort({ checkInAt: -1 }).skip((page - 1) * limit).limit(limit).populate('visitor').populate('pass').lean(),
    VisitorLog.countDocuments(query)
  ]);
  return res.json({ success: true, data: logs, meta: { page, limit, total } });
}

module.exports = { checkIn, checkOut, listInside, listLogs };