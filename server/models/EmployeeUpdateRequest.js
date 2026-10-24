const mongoose = require('mongoose');

const employeeUpdateRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  changes: { type: mongoose.Schema.Types.Mixed, required: true },
  proof: { key: String, url: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String
}, { timestamps: true });

module.exports = mongoose.model('EmployeeUpdateRequest', employeeUpdateRequestSchema);