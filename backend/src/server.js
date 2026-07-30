import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import authRoutes from './routes/authRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { asyncHandler } from './utils/asyncHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/conversations', asyncHandler(requireAuth), conversationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception, shutting down', err);
  process.exit(1);
});

connectDb()
  .then(() => {
    const server = app.listen(config.port, () => {
      console.log(`Backend running on http://localhost:${config.port}`);
    });

    server.on('error', (err) => {
      console.error('HTTP server error', err);
      process.exit(1);
    });

    const shutdown = (signal) => {
      console.log(`Received ${signal}, shutting down`);
      server.close(async (err) => {
        if (err) console.error('Error while closing HTTP server', err);
        try {
          await disconnectDb();
        } catch (dbErr) {
          console.error('Error while disconnecting from MongoDB', dbErr);
        }
        process.exit(err ? 1 : 0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('Failed to connect DB', err);
    process.exit(1);
  });
