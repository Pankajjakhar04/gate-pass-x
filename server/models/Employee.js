const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, immutable: true, trim: true },
  name: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  residentialUnit: { type: String, trim: true },
  address: { type: String, trim: true },
  presentAddress: { type: String, trim: true },
  permanentAddress: { type: String, trim: true },
  photo: { key: String, url: String },
  idCard: { key: String, url: String },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);