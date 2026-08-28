import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/User.js';

async function run() {
  if (!env.MONGO_URI) {
    console.error('MONGO_URI is not set. Add it to .env first.');
    process.exit(1);
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script.');
    process.exit(1);
  }

  await mongoose.connect(env.MONGO_URI);

  const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin already exists: ${existing.email} (role: ${existing.role})`);
    await mongoose.disconnect();
    return;
  }

  const admin = await User.create({
    name: process.env.ADMIN_NAME || 'Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
    isEmailVerified: true,
  });

  console.log(`Admin created: ${admin.email}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
