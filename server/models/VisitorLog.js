const mongoose = require('mongoose');

const visitorLogSchema = new mongoose.Schema({
  pass: { type: mongoose.Schema.Types.ObjectId, ref: 'Pass', required: true },
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor', required: true },
  securityUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkInAt: { type: Date, default: Date.now, required: true },
  checkOutAt: Date,
  notes: String
}, { timestamps: true });

visitorLogSchema.index({ pass: 1, checkOutAt: 1 }, { unique: true, partialFilterExpression: { checkOutAt: null } });
visitorLogSchema.index({ checkInAt: -1 });

module.exports = mongoose.model('VisitorLog', visitorLogSchema);