import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;
const EXPECTED_DB_NAME = 'ayezacosmetics';

let listenersAttached = false;

function getMongoUri(): string {
  const uri = (process.env.MONGODB_URI || '').trim();

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not defined. Set it in Railway Variables or local .env'
    );
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(
      'MONGODB_URI must start with mongodb:// or mongodb+srv://'
    );
  }

  const isLocalhost =
    uri.includes('127.0.0.1') ||
    uri.includes('localhost') ||
    uri.includes('0.0.0.0');

  if (process.env.NODE_ENV === 'production' && isLocalhost) {
    throw new Error(
      'MONGODB_URI points to localhost — use MongoDB Atlas on Railway/production'
    );
  }

  return uri;
}

/** Never log credentials. */
function redactMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.username || parsed.password) {
      parsed.username = '***';
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return 'mongodb://***';
  }
}

function attachConnectionListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
  });
}

export const isDatabaseConnected = (): boolean =>
  mongoose.connection.readyState === 1;

/**
 * Connect to MongoDB Atlas. Retries then throws — caller must exit.
 * Does not start Express; call this before app.listen().
 */
export const connectDatabase = async (retries = MAX_RETRIES): Promise<void> => {
  const uri = getMongoUri();
  logger.info(`Connecting to MongoDB... ${redactMongoUri(uri)}`);

  try {
    await mongoose.connect(uri, {
      dbName: EXPECTED_DB_NAME,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // Prefer IPv4 — avoids some Railway/DNS SRV resolution failures
      family: 4,
    });

    attachConnectionListeners();

    const dbName = mongoose.connection.name;
    if (dbName !== EXPECTED_DB_NAME) {
      logger.warn(
        `Expected database "${EXPECTED_DB_NAME}" but connected to "${dbName}"`
      );
    }

    logger.info('✓ MongoDB Connected');
    logger.info(`📊 Database: ${dbName}`);
    logger.info(`🔗 URI: ${redactMongoUri(uri)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`MongoDB connection attempt failed: ${message}`);

    const isAuthError = /auth|Authentication failed|bad auth/i.test(message);
    if (isAuthError) {
      logger.error(
        '✗ MongoDB authentication failed — check MONGODB_URI username/password in Railway Variables'
      );
      throw new Error(
        `Unable to connect to MongoDB (${redactMongoUri(uri)}): ${message}`
      );
    }

    if (retries > 0) {
      logger.warn(
        `Retrying in ${RETRY_DELAY_MS / 1000}s... (${retries} left)`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDatabase(retries - 1);
    }

    logger.error('✗ MongoDB connection failed after all retries');
    throw new Error(
      `Unable to connect to MongoDB (${redactMongoUri(uri)}): ${message}`
    );
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};
