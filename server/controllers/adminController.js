const { z } = require('zod');
const AuditLog = require('../models/AuditLog');
const Pass = require('../models/Pass');
const Setting = require('../models/Setting');
const VisitorLog = require('../models/VisitorLog');
const ApiError = require('../utils/ApiError');
const { defaults } = require('../services/settingService');
const { writeAudit } = require('../services/auditService');

function dateRange(query) {
  const range = {};
  if (query.from) range.$gte = new Date(query.from);
  if (query.to) range.$lte = new Date(query.to);
  return Object.keys(range).length ? range : undefined;
}

async function dashboard(req, res) {
  const generatedAt = dateRange(req.query);
  const match = generatedAt ? { generatedAt } : {};
  const [statusCounts, inside, trend] = await Promise.all([
    Pass.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    VisitorLog.countDocuments({ checkOutAt: null }),
    Pass.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$generatedAt', timezone: process.env.TZ_DEFAULT || 'Asia/Kolkata' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);
  const counts = Object.fromEntries(statusCounts.map((entry) => [entry._id, entry.count]));
  return res.json({ success: true, data: { generated: Object.values(counts).reduce((total, count) => total + count, 0), active: counts.active || 0, expired: counts.expired || 0, revoked: counts.revoked || 0, pending: counts.pending || 0, inside, trend: trend.map((entry) => ({ date: entry._id, count: entry.count })) } });
}

async function getSettings(_req, res) {
  const stored = await Setting.find({}).lean();
  const settings = { ...defaults, ...Object.fromEntries(stored.map((setting) => [setting.key, setting.value])) };
  return res.json({ success: true, data: settings });
}

const settingsSchema = z.object({
  dependentValidityDays: z.number().int().positive().optional(),
  dependentApprovalRequired: z.boolean().optional(),
  visitorValidityHours: z.number().positive().optional(),
  maxActiveVisitorPassesPerEmployee: z.number().int().positive().optional(),
  allowMultiEntry: z.boolean().optional()
}).strict();

async function updateSettings(req, res) {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid settings', parsed.error.flatten());
  const before = await getSettingsValue();
  await Promise.all(Object.entries(parsed.data).map(([key, value]) => Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true, setDefaultsOnInsert: true })));
  const after = { ...before, ...parsed.data };
  await writeAudit({ action: 'SETTINGS_CHANGED', actor: req.user._id, actorRole: req.user.role, targetType: 'Setting', outcome: 'success', ip: req.ip, meta: { old: before, new: after } });
  return res.json({ success: true, data: after });
}

async function getSettingsValue() {
  const stored = await Setting.find({}).lean();
  return { ...defaults, ...Object.fromEntries(stored.map((setting) => [setting.key, setting.value])) };
}

async function listPasses(req, res) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const query = {};
  if (req.query.status) query.status = req.query.status;
  const [passes, total] = await Promise.all([
    Pass.find(query).sort({ generatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('employee').populate('visitor').populate('dependent').lean(),
    Pass.countDocuments(query)
  ]);
  return res.json({ success: true, data: passes, meta: { page, limit, total } });
}

async function listAuditLogs(req, res) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const query = {};
  if (req.query.action) query.action = req.query.action;
  if (req.query.actorRole) query.actorRole = req.query.actorRole;
  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('actor', 'email role').lean(),
    AuditLog.countDocuments(query)
  ]);
  return res.json({ success: true, data: logs, meta: { page, limit, total } });
}

module.exports = { dashboard, getSettings, updateSettings, listPasses, listAuditLogs };