const Pass = require('../models/Pass');
const { writeAudit } = require('./auditService');
const { hashToken } = require('./passService');
const { privatePhotoUrl } = require('../config/cloudinary');
const VisitorLog = require('../models/VisitorLog');

async function auditVerification({ actor, ip, pass, valid, reason }) {
  await writeAudit({
    action: 'PASS_VERIFIED', actor: actor._id, actorRole: actor.role,
    targetType: 'Pass', targetId: pass?._id?.toString(), outcome: valid ? 'success' : 'failure', ip,
    meta: { valid, reason }
  });
}

function invalidResult(code) {
  return { valid: false, code, message: code === 'INVALID_PASS' ? 'Invalid pass' : 'Pass cannot be used', reason: code };
}

async function verifyPass({ qrToken, passId, actor, ip }) {
  const query = qrToken ? { qrTokenHash: hashToken(qrToken) } : { passId };
  const pass = await Pass.findOne(query)
    .select('+qrTokenHash +qrTokenEncrypted')
    .populate('employee')
    .populate('visitor')
    .populate('dependent');

  if (!pass) {
    await auditVerification({ actor, ip, pass: null, valid: false, reason: 'INVALID_PASS' });
    return invalidResult('INVALID_PASS');
  }

  let reason = null;
  let nextAction = null;
  if (pass.status === 'revoked') reason = 'PASS_REVOKED';
  else if (pass.status === 'pending') reason = 'PASS_PENDING';
  else if (pass.employee && !pass.employee.isActive) reason = 'PASS_OWNER_INACTIVE';
  else if (pass.dependent && pass.dependent.status !== 'approved') reason = 'PASS_DEPENDENT_INACTIVE';
  else if (new Date() < pass.validFrom) reason = 'PASS_NOT_YET_VALID';
  else if (new Date() > pass.validUntil) {
    if (pass.status === 'active') { pass.status = 'expired'; await pass.save(); }
    reason = 'PASS_EXPIRED';
  }
  if (!reason && pass.visitor) {
    const openLog = await VisitorLog.findOne({ pass: pass._id, checkOutAt: null });
    if (openLog) nextAction = 'check-out';
    else if (pass.maxEntries > 0 && await VisitorLog.countDocuments({ pass: pass._id }) >= pass.maxEntries) reason = 'PASS_ENTRY_LIMIT';
    else nextAction = 'check-in';
  }

  if (reason) {
    await auditVerification({ actor, ip, pass, valid: false, reason });
    return invalidResult(reason);
  }

  const subject = pass.visitor || pass.dependent || pass.employee;
  const photo = subject?.photo?.key ? { ...subject.photo.toObject?.() || subject.photo, url: privatePhotoUrl(subject.photo.key) } : undefined;
  const result = {
    valid: true,
    code: 'PASS_VALID',
    pass: {
      passId: pass.passId,
      passType: pass.passType,
      status: pass.status,
      validFrom: pass.validFrom,
      validUntil: pass.validUntil,
      generatedAt: pass.generatedAt
    },
    subject: { name: subject.name, phone: subject.phone, purpose: subject.purpose, relationship: subject.relationship, photo },
    referenceEmployee: { name: pass.employee.name, department: pass.employee.department },
    nextAction
  };
  await auditVerification({ actor, ip, pass, valid: true, reason: 'PASS_VALID' });
  return result;
}

module.exports = { verifyPass };