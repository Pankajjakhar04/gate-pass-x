const crypto = require('crypto');
const Pass = require('../models/Pass');
const { writeAudit } = require('../services/auditService');

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function sweep(req, res) {
  const expected = process.env.CRON_SECRET;
  const authorization = req.get('authorization') || '';
  const expectedBearer = expected ? `Bearer ${expected}` : '';

  // Enforce strong secret check (at least 16 chars) and constant-time string comparison
  if (!expected || expected.length < 16 || !safeCompare(authorization, expectedBearer)) {
    return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Invalid cron credentials' });
  }

  const expired = await Pass.find({ status: 'active', validUntil: { $lt: new Date() } }).select('_id passId createdBy employee');
  if (expired.length) {
    await Pass.updateMany({ _id: { $in: expired.map((pass) => pass._id) } }, { $set: { status: 'expired' } });
    await Promise.all(expired.map((pass) => writeAudit({ action: 'PASS_EXPIRED', targetType: 'Pass', targetId: pass._id.toString(), outcome: 'success', meta: { passId: pass.passId } })));
  }
  return res.json({ success: true, data: { expired: expired.length } });
}

module.exports = { sweep };