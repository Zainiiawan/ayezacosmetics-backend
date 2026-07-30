import winston from 'winston';
import fs from 'fs';
import path from 'path';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logLevel = process.env.LOG_LEVEL || 'info';

/**
 * Serverless / read-only FS (Vercel, Lambda): never mkdir or write log files.
 * Local development: optional file transports.
 */
const isServerless =
  process.env.VERCEL === '1' ||
  process.env.VERCEL_ENV !== undefined ||
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

const isProduction = process.env.NODE_ENV === 'production';

/** File logging only in local non-serverless development */
const useFileLogging = !isServerless && !isProduction;

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  simple()
);

const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    silent: process.env.NODE_ENV === 'test',
  }),
];

let fileLoggingReady = false;

if (useFileLogging) {
  try {
    const logFile = process.env.LOG_FILE || 'logs/app.log';
    const logDir = path.dirname(path.resolve(logFile));

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.resolve(logFile),
        format: fileFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      })
    );
    fileLoggingReady = true;
  } catch {
    // Disk unavailable — console-only; never crash the process
  }
}

export const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: 'ayeza-api' },
  transports,
  exceptionHandlers: [
    new winston.transports.Console({ format: consoleFormat }),
    ...(fileLoggingReady
      ? [new winston.transports.File({ filename: 'logs/exceptions.log', format: fileFormat })]
      : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console({ format: consoleFormat }),
    ...(fileLoggingReady
      ? [new winston.transports.File({ filename: 'logs/rejections.log', format: fileFormat })]
      : []),
  ],
  exitOnError: false,
});
