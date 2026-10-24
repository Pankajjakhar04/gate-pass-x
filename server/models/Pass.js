const mongoose = require('mongoose');

const passSchema = new mongoose.Schema({
  passId: { type: String, required: true, unique: true, immutable: true },
  passType: { type: String, enum: ['employee', 'dependent', 'visitor'], required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' },
  dependent: { type: mongoose.Schema.Types.ObjectId, ref: 'Dependent' },
  qrTokenHash: { type: String, required: true, unique: true, select: false },
  qrTokenEncrypted: { type: String, required: true, select: false },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true, index: true },
  generatedAt: { type: Date, default: Date.now, immutable: true },
  status: { type: String, enum: ['pending', 'active', 'expired', 'revoked'], default: 'active', index: true },
  maxEntries: { type: Number, default: 1 },
  revokedAt: Date,
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokeReason: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

passSchema.pre('validate', function validateOwner(next) {
  const subjects = [this.visitor, this.dependent].filter(Boolean).length;
  const validEmployeePass = this.passType === 'employee' && subjects === 0;
  const validSubjectPass = ['visitor', 'dependent'].includes(this.passType) && subjects === 1;
  const matchingSubject = this.passType === 'visitor' ? this.visitor : this.passType === 'dependent' ? this.dependent : this.employee;
  if (!this.employee || (!validEmployeePass && !validSubjectPass) || !matchingSubject) return next(new Error('Pass must have one valid pass subject and a reference employee'));
  return next();
});

module.exports = mongoose.model('Pass', passSchema);