import './loadEnv';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { connectDatabase, isDatabaseConnected } from './config/database';
import { configurePassport } from './config/passport';
import { configureCloudinary } from './config/cloudinary';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import brandRoutes from './routes/brand.routes';
import cartRoutes from './routes/cart.routes';
import wishlistRoutes from './routes/wishlist.routes';
import orderRoutes from './routes/order.routes';
import reviewRoutes from './routes/review.routes';
import couponRoutes from './routes/coupon.routes';
import userRoutes from './routes/user.routes';
import analyticsRoutes from './routes/analytics.routes';
import mediaRoutes from './routes/media.routes';
import paymentRoutes from './routes/payment.routes';
import notificationRoutes from './routes/notification.routes';
import contactRoutes from './routes/contact.routes';
import shippingRoutes from './routes/shipping.routes';
import settingsRoutes from './routes/settings.routes';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ---------------------------------------------------------------------------
// CORS — Production-ready configuration.
//
// Strategy:
//   • In production (CORS_ORIGIN env set on Render):
//       origin is an allowlist function → only the Netlify domain is allowed.
//       Access-Control-Allow-Origin will be the EXACT incoming origin if it
//       matches the list, which satisfies browsers when credentials:true.
//   • In development / no env var:
//       origin:true reflects any incoming Origin back — safe for a JWT API
//       where auth state lives in localStorage, not cookies.
//
// NEVER use '*' with credentials:true — browsers reject it.
// ---------------------------------------------------------------------------

const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, '')) // Strip trailing slashes to prevent mismatches
  .filter(Boolean);

const originOption: cors.CorsOptions['origin'] = envOrigins.length > 0
  ? (incoming, callback) => {
      // Allow requests with no Origin header (curl, Postman, server-to-server)
      if (!incoming) return callback(null, true);
      if (envOrigins.includes(incoming)) {
        return callback(null, true);
      }
      logger.warn(`CORS blocked origin: ${incoming}`);
      return callback(new Error(`CORS: Origin '${incoming}' is not allowed.`), false);
    }
  : true; // reflect all origins when no allowlist configured (development)

if (envOrigins.length > 0) {
  logger.info(`CORS allowlist: ${envOrigins.join(', ')}`);
} else {
  logger.info('CORS: origin:true — reflecting all origins (JWT-based API, no CORS_ORIGIN set)');
}

const corsOptions: cors.CorsOptions = {
  origin: originOption,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,        // Browser caches preflight for 24h — reduces OPTIONS requests
  optionsSuccessStatus: 204,
};

// ─── OPTIONS preflight handler ────────────────────────────────────────────────
// Must be registered BEFORE app.use(cors()) so preflight requests are answered
// immediately and never reach auth, rate-limit, or any other middleware.
app.options('*', cors(corsOptions));

// ─── CORS headers on every response ──────────────────────────────────────────
app.use(cors(corsOptions));



app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

configurePassport();
app.use(passport.initialize());

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background-color: #0a0a0a; }',
  customSiteTitle: 'AYEZA COSMETICS API',
}));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

const API_PREFIX = '/api';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/brands`, brandRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/coupons`, couponRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/media`, mediaRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/contact`, contactRoutes);
app.use(`${API_PREFIX}/shipping`, shippingRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '5001', 10);

/**
 * 1) Connect MongoDB (required)
 * 2) Only then bind Express — Render /health works after this
 */
const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    try {
      configureCloudinary();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Cloudinary configuration skipped/failed: ${message}`);
    }

    const server = app.listen(PORT, HOST, () => {
      logger.info('✓ Express Started');
      logger.info(`🚀 Listening on http://${HOST}:${PORT}`);
      logger.info(`🏥 Health: http://${HOST}:${PORT}/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      logger.error(`HTTP server failed to bind on ${HOST}:${PORT}:`, error);
      process.exit(1);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`✗ Failed to start server: ${message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

void startServer();

export default app;
