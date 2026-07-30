export function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

export function badRequest(res, message) {
  return sendError(res, 400, message);
}

export function unauthorized(res, message = 'Unauthorized') {
  return sendError(res, 401, message);
}

export function notFound(res, resource = 'Resource') {
  return sendError(res, 404, `${resource} not found`);
}
