// Express 4 does not catch rejected promises from async route handlers —
// an unhandled rejection in a controller would hang the request instead of
// reaching errorHandler.js. This wrapper closes that gap.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
