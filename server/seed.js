require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const User = require('./models/User');

async function seed() {
  await connectDB();
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 10) throw new Error('SEED_ADMIN_PASSWORD must be set and contain at least 10 characters');

  const existing = await User.findOne({ email });
  if (existing) {
    existing.passwordHash = await bcrypt.hash(password, 12);
    existing.role = 'admin';
    existing.isActive = true;
    await existing.save();
    console.log(`Admin credentials synchronized: ${email}`);
    return;
  }

  await User.create({ email, passwordHash: await bcrypt.hash(password, 12), role: 'admin', isActive: true });
  console.log(`Created admin: ${email}`);
}

seed()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());