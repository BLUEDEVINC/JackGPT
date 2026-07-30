import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDb() {
  mongoose.connection.on('error', (err) => {
    // Errors emitted after the initial connect never reach the connect() promise.
    console.error('MongoDB connection error', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
