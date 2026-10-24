const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  photo: { key: String, url: String },
  purpose: { type: String, trim: true },
  referenceEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true }
}, { timestamps: true });

visitorSchema.index({ name: 'text' });

module.exports = mongoose.model('Visitor', visitorSchema);