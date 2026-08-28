import { ApiError } from '../utils/ApiError.js';

/** Usage: router.get('/admin-only', protect, authorize('admin'), handler) */
export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};
