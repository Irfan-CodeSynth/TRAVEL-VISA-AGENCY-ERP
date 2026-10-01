import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/error-handler';
import { NotFoundError } from './lib/errors';

export const app = express();

// Security middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per `window`
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Static uploads (inline previews; authenticated download endpoint is used for originals)
const uploadRoot = path.resolve(config.storage.uploadDir);
fs.mkdirSync(uploadRoot, { recursive: true });
app.use('/uploads', express.static(uploadRoot));

// API Routes
app.use('/api/v1', apiRouter);

// 404 Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Global Error Handler
app.use(errorHandler);
