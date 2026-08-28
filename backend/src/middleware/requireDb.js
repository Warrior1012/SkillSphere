import { isDbConnected } from '../config/db.js';

export function requireDb(req, res, next) {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. Set MONGO_URI and restart the server.',
    });
  }
  next();
}
