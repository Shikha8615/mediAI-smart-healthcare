const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
    await seedAdmin();
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  const User = require('../models/User');
  const bcrypt = require('bcryptjs');
  const exists = await User.findOne({ role: 'admin' });
  if (!exists) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await User.create({
      name: 'System Administrator',
      email: process.env.ADMIN_EMAIL,
      password: hashed,
      role: 'admin',
      isActive: true,
    });
    console.log('✅ Admin seeded:', process.env.ADMIN_EMAIL);
  }
};

module.exports = connectDB;
