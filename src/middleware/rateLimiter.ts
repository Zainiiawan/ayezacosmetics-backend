import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 min
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

// Skip OPTIONS preflight requests — they must never be blocked by rate limiting
// or the browser will report a CORS error instead of a rate-limit error.
const skipOptions = (req: Request) => req.method === 'OPTIONS';

// When a request IS rate-limited, send a JSON body and include CORS headers
// so the browser can read the 429 response instead of treating it as a CORS error.
const rateLimitHandler = (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', res.getHeader('Access-Control-Allow-Origin') || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
  });
};

// ==========================================
// General Rate Limiter
// ==========================================
export const generalLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  handler: rateLimitHandler,
});

// ==========================================
// Auth Rate Limiter (stricter)
// ==========================================
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipOptions,
  handler: (_req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', res.getHeader('Access-Control-Allow-Origin') || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
    });
  },
});

// ==========================================
// Password Reset Limiter
// ==========================================
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  handler: rateLimitHandler,
});

// ==========================================
// Upload Rate Limiter
// ==========================================
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  handler: rateLimitHandler,
});

