const upload = require('./upload');

module.exports = upload.create(3).fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'idCard', maxCount: 1 },
  { name: 'proof', maxCount: 1 }
]);