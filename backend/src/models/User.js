import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    avatarUrl: { type: String },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
