/**
 * Wraps an async Express handler so rejected promises reach the error middleware
 * instead of becoming unhandled rejections that leave the request hanging.
 */
export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
