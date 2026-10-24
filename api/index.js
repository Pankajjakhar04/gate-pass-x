const app = require('../server/app');
const { connectDB } = require('../server/config/db');

module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};