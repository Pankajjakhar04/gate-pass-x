const Setting = require('../models/Setting');

const defaults = {
  dependentValidityDays: 365,
  dependentApprovalRequired: false,
  visitorValidityHours: 24,
  maxActiveVisitorPassesPerEmployee: 10,
  allowMultiEntry: false
};

async function getSetting(key) {
  const setting = await Setting.findOne({ key }).lean();
  return setting ? setting.value : defaults[key];
}

async function getSettings(keys = []) {
  const query = keys.length ? { key: { $in: keys } } : {};
  const settings = await Setting.find(query).lean();
  const result = { ...defaults };
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

module.exports = { defaults, getSetting, getSettings };