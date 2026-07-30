import mongoose from 'mongoose';

export function objectIdRef(ref, { required = false } = {}) {
  return { type: mongoose.Schema.Types.ObjectId, ref, index: true, required };
}
