const AuditLog = require('../models/AuditLog');

async function writeAudit({ action, actor, actorRole, targetType, targetId, outcome, meta, ip }) {
  return AuditLog.create({ action, actor, actorRole, targetType, targetId, outcome, meta, ip });
}

module.exports = { writeAudit };