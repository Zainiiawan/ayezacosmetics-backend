import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Types } from 'mongoose';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole } from '../shared';

// Augment Express Request to include user
declare global {
  namespace Express {
    interface User {
      _id: Types.ObjectId | string;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      isEmailVerified: boolean;
      isActive: boolean;
    }
  }
}

// ==========================================
// Authenticate Middleware — Required
// ==========================================
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (err: Error, user: Express.User) => {
    if (err) return next(err);
    if (!user) return next(new UnauthorizedError('Authentication required. Please log in.'));
    req.user = user;
    next();
  })(req, res, next);
};

// ==========================================
// Authenticate Middleware — Optional
// ==========================================
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (_err: Error, user: Express.User) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};

// ==========================================
// Authorization Middleware — Roles
// ==========================================
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }

    next();
  };
};

// ==========================================
// Admin Only
// ==========================================
export const adminOnly = [authenticate, authorize('admin')];

// ==========================================
// Email Verification Check
// ==========================================
export const requireEmailVerification = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user?.isEmailVerified) {
    return next(new ForbiddenError('Please verify your email address to continue.'));
  }
  next();
};
