import mongoose from 'mongoose';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function translate(err) {
  if (err instanceof HttpError) return { status: err.status, message: err.message, expose: err.expose };

  if (err instanceof mongoose.Error.CastError) {
    return { status: 400, message: `Invalid value for '${err.path}'`, expose: true };
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
    return { status: 400, message: details || 'Validation failed', expose: true };
  }
  if (err?.code === 11000) {
    return { status: 409, message: 'Resource already exists', expose: true };
  }
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return { status: 400, message: 'Malformed JSON body', expose: true };
  }
  if (err?.type === 'entity.too.large') {
    return { status: 413, message: 'Payload too large', expose: true };
  }

  return { status: err?.status || err?.statusCode || 500, message: 'Internal server error', expose: false };
}

export function errorHandler(err, req, res, next) {
  const { status, message, expose } = translate(err);

  const log = status >= 500 ? console.error : console.warn;
  log(`[${req.method} ${req.originalUrl}] ${status} ${err?.message || 'Unknown error'}`, {
    name: err?.name,
    code: err?.code,
    cause: err?.cause?.message,
    stack: status >= 500 ? err?.stack : undefined
  });

  // Headers already flushed (e.g. an SSE stream): let Express destroy the
  // connection instead of throwing ERR_HTTP_HEADERS_SENT on top of the error.
  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({ error: expose ? message : 'Internal server error' });
}
