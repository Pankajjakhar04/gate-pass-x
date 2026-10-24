const mongoose = require('mongoose');

const registrationRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, trim: true },
  fullName: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  presentAddress: { type: String, required: true, trim: true },
  permanentAddress: { type: String, required: true, trim: true },
  mobileNumber: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  profilePhoto: { key: { type: String, required: true }, url: { type: String, required: true } },
  idCard: { key: { type: String, required: true }, url: { type: String, required: true } },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String
}, { timestamps: true });

registrationRequestSchema.index({ email: 1, status: 1 });
registrationRequestSchema.index({ employeeId: 1, status: 1 });

module.exports = mongoose.model('RegistrationRequest', registrationRequestSchema);