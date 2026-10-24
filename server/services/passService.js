const crypto = require('crypto');
const Pass = require('../models/Pass');

function secretKey() {
  if (!process.env.QR_SECRET || process.env.QR_SECRET.length < 32) throw new Error('QR_SECRET must contain at least 32 characters');
  return crypto.createHash('sha256').update(process.env.QR_SECRET).digest();
}

function encryptToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function decryptToken(value) {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createPassId(prefix = 'EP') {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  // Increased entropy using 8-character cryptographic hex suffix
  const suffix = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}

async function savePassWithRetry(factory, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await factory();
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.passId && attempt < retries - 1) {
        continue;
      }
      throw error;
    }
  }
}

async function createEmployeePass({ employee, createdBy, validUntil }) {
  const token = crypto.randomBytes(32).toString('base64url');
  return savePassWithRetry(() => Pass.create({
    passId: createPassId('EP'),
    passType: 'employee',
    employee: employee._id,
    qrTokenHash: hashToken(token),
    qrTokenEncrypted: encryptToken(token),
    validFrom: new Date(),
    validUntil,
    createdBy
  }));
}

async function createDependentPass({ employee, dependent, createdBy, validUntil }) {
  const token = crypto.randomBytes(32).toString('base64url');
  return savePassWithRetry(() => Pass.create({
    passId: createPassId('DP'),
    passType: 'dependent',
    employee: employee._id,
    dependent: dependent._id,
    qrTokenHash: hashToken(token),
    qrTokenEncrypted: encryptToken(token),
    validFrom: new Date(),
    validUntil,
    createdBy
  }));
}

async function createVisitorPass({ employee, visitor, createdBy, validUntil, maxEntries }) {
  const token = crypto.randomBytes(32).toString('base64url');
  return savePassWithRetry(() => Pass.create({
    passId: createPassId('VP'),
    passType: 'visitor',
    employee: employee._id,
    visitor: visitor._id,
    qrTokenHash: hashToken(token),
    qrTokenEncrypted: encryptToken(token),
    validFrom: new Date(),
    validUntil,
    maxEntries,
    createdBy
  }));
}

function passView(pass, includeQr) {
  const result = {
    id: pass._id,
    passId: pass.passId,
    passType: pass.passType,
    employee: pass.employee,
    validFrom: pass.validFrom,
    validUntil: pass.validUntil,
    generatedAt: pass.generatedAt,
    status: pass.status
  };
  if (pass.visitor) result.visitor = pass.visitor;
  if (pass.dependent) result.dependent = pass.dependent;
  if (includeQr) {
    const token = decryptToken(pass.qrTokenEncrypted);
    result.qrPayload = JSON.stringify({ p: pass.passId, t: token });
  }
  return result;
}

module.exports = { createEmployeePass, createDependentPass, createVisitorPass, passView, hashToken, decryptToken, createPassId };