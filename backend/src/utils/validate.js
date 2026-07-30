import mongoose from 'mongoose';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export function requireString(value, field, { max = 1000, min = 1 } = {}) {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw new ValidationError(`${field} is required`);
  if (trimmed.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  return trimmed;
}

export function optionalString(value, field, options) {
  if (value === undefined || value === null) return undefined;
  return requireString(value, field, options);
}

export function requireEmail(value) {
  const email = requireString(value, 'email', { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('email must be a valid address');
  return email;
}

export function requirePassword(value) {
  if (typeof value !== 'string') throw new ValidationError('password must be a string');
  if (value.length < 8) throw new ValidationError('password must be at least 8 characters');
  if (value.length > 200) throw new ValidationError('password must be at most 200 characters');
  return value;
}

export function requireObjectId(value, field) {
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
    throw new ValidationError(`${field} is not a valid id`);
  }
  return value;
}
