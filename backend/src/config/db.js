import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  if (!env.MONGO_URI) {
    console.warn('[db] MONGO_URI not set — starting without a database. DB-dependent routes will return 503.');
    return;
  }

  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`[db] connected (${mongoose.connection.name})`);
  } catch (err) {
    console.error('[db] initial connection failed:', err.message);
    console.error('[db] server will still boot — DB routes will 503 until this is resolved.');
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
