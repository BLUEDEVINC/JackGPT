export class HttpError extends Error {
  constructor(status, message, options = {}) {
    super(message, { cause: options.cause });
    this.name = 'HttpError';
    this.status = status;
    this.expose = options.expose ?? status < 500;
    this.code = options.code;
  }
}

export const badRequest = (message, options) => new HttpError(400, message, options);
export const unauthorized = (message, options) => new HttpError(401, message, options);
export const notFound = (message, options) => new HttpError(404, message, options);
export const conflict = (message, options) => new HttpError(409, message, options);
export const badGateway = (message, options) => new HttpError(502, message, options);
